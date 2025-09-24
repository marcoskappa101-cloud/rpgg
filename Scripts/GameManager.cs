using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SocketIOClient;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;
    
    [Header("Spawn Settings")]
    public Transform spawnPoint;
    public string defaultMap = "village_of_gludin";
    
    [Header("Player Prefabs")]
    public GameObject localPlayerPrefab;
    public GameObject remotePlayerPrefab;
    
    [Header("Camera")]
    public CameraController cameraController;
    
    [Header("Enemy Settings")]
    public GameObject enemyPrefab;
    
    [Header("Click Indicator")]
    public GameObject clickIndicatorPrefab;
    
    private NetworkPlayerManager playerManager;
    private Dictionary<string, GameObject> enemies = new Dictionary<string, GameObject>();
    private GameObject localPlayer;
    private string localCharacterId;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            
            // Inicializar componentes
            playerManager = GetComponent<NetworkPlayerManager>();
            if (playerManager == null)
            {
                playerManager = gameObject.AddComponent<NetworkPlayerManager>();
            }
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        SetupGameEvents();
        RequestSpawn();
    }

    void SetupGameEvents()
    {
        // Resposta ao entrar no mundo
        SocketIOManager.Instance.On("enter_world_response", (response) =>
        {
            var data = SocketIOManager.GetData<EnterWorldResponse>(response);
            
            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.success)
                {
                    Debug.Log("Entrando no mundo com sucesso!");
                    SpawnLocalPlayer(data.character, data.spawnInfo);
                    SpawnNearbyPlayers(data.spawnInfo.nearbyPlayers);
                    SpawnMonsters(data.spawnInfo.monsters);
                }
                else
                {
                    Debug.LogError("Erro ao entrar no mundo: " + data.error);
                }
            });
        });
        
        // Jogador entrou no mapa
        SocketIOManager.Instance.On("player_joined", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerJoinedData>(response);
            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.characterId != localCharacterId)
                {
                    Debug.Log($"Novo jogador entrou: {data.name}");
                    SpawnRemotePlayer(data);
                }
            });
        });
        
        // Jogador saiu do mapa
        SocketIOManager.Instance.On("player_left", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerLeftData>(response);
            MainThreadDispatcher.Enqueue(() =>
            {
                Debug.Log($"Jogador saiu: {data.name}");
                RemovePlayer(data.characterId);
            });
        });
        
        // Jogador se moveu
        SocketIOManager.Instance.On("player_moved", (response) =>
        {
            var data = SocketIOManager.GetData<PlayerMovedData>(response);
            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.characterId != localCharacterId)
                {
                    UpdatePlayerPosition(data.characterId, data.posX, data.posY, data.posZ);
                }
            });
        });
        
        // Atualização de combate
        SocketIOManager.Instance.On("combat_update", (response) =>
        {
            var data = SocketIOManager.GetData<CombatUpdateData>(response);
            MainThreadDispatcher.Enqueue(() =>
            {
                HandleCombatUpdate(data);
            });
        });
    }

    void RequestSpawn()
    {
        if (!string.IsNullOrEmpty(SocketIOManager.Instance.characterId))
        {
            var enterWorldData = new
            {
                characterId = SocketIOManager.Instance.characterId
            };
            
            Debug.Log($"Solicitando spawn no mundo com characterId: {SocketIOManager.Instance.characterId}");
            SocketIOManager.Instance.Emit("enter_world", enterWorldData);
        }
        else
        {
            Debug.LogError("CharacterId não encontrado. Não foi possível solicitar spawn.");
            
            // Fallback: tentar usar dados do CharacterManager
            if (CharacterManager.Instance != null && !string.IsNullOrEmpty(CharacterManager.Instance.characterId))
            {
                SocketIOManager.Instance.characterId = CharacterManager.Instance.characterId;
                RequestSpawn();
            }
        }
    }

    void SpawnLocalPlayer(CharacterData character, SpawnInfo spawnInfo)
    {
        Vector3 spawnPosition = new Vector3(spawnInfo.x, spawnInfo.y, spawnInfo.z);
        
        // Usar spawn point se a posição do servidor for inválida
        if (spawnPosition == Vector3.zero && spawnPoint != null)
        {
            spawnPosition = spawnPoint.position;
        }
        
        // Garantir que a posição Y seja válida
        if (spawnPosition.y < 0)
        {
            spawnPosition.y = 0;
        }
        
        // Usar NetworkPlayerManager para spawn
        localPlayer = playerManager.SpawnPlayer(character, spawnPosition, true);
        localCharacterId = character.id;
        
        // Configurar prefab específico para jogador local se definido
        if (localPlayerPrefab != null && localPlayer.GetComponent<PlayerController>() == null)
        {
            // Destruir o atual e criar com o prefab correto
            Destroy(localPlayer);
            localPlayer = Instantiate(localPlayerPrefab, spawnPosition, Quaternion.identity);
            
            var controller = localPlayer.GetComponent<PlayerController>();
            controller.isLocalPlayer = true;
            controller.SetCharacterData(character);
            controller.SetPlayerName(character.name);
        }
        
        // Configurar indicador de clique
        if (clickIndicatorPrefab != null)
        {
            var controller = localPlayer.GetComponent<PlayerController>();
            if (controller != null)
            {
                // Adicionar referência ao clickIndicator no PlayerController
                // (Isso pode ser feito via Inspector ou código)
            }
        }
        
        // Configurar câmera para seguir o jogador local
        SetupCameraForLocalPlayer();
        
        Debug.Log($"Jogador local spawnou: {character.name} na posição {spawnPosition}");
    }
    
    void SetupCameraForLocalPlayer()
    {
        if (localPlayer == null) return;
        
        if (cameraController != null)
        {
            cameraController.SetTarget(localPlayer.transform);
        }
        else
        {
            // Fallback: configurar câmera básica
            Camera mainCamera = Camera.main;
            if (mainCamera != null)
            {
                Vector3 cameraPosition = localPlayer.transform.position + new Vector3(0, 10, -10);
                mainCamera.transform.position = cameraPosition;
                mainCamera.transform.LookAt(localPlayer.transform);
                
                // Adicionar CameraController se não existir
                CameraController camController = mainCamera.GetComponent<CameraController>();
                if (camController == null)
                {
                    camController = mainCamera.gameObject.AddComponent<CameraController>();
                }
                camController.SetTarget(localPlayer.transform);
            }
        }
    }

    void SpawnNearbyPlayers(NearbyPlayerData[] nearbyPlayers)
    {
        if (nearbyPlayers == null) return;
        
        Debug.Log($"Spawnando {nearbyPlayers.Length} jogadores próximos");
        
        foreach (var playerData in nearbyPlayers)
        {
            if (playerData.characterId != localCharacterId)
            {
                SpawnRemotePlayer(new PlayerJoinedData
                {
                    characterId = playerData.characterId,
                    name = playerData.name,
                    classe = playerData.classe,
                    race = playerData.race,
                    level = playerData.level,
                    posX = playerData.pos_x,
                    posY = playerData.pos_y,
                    posZ = playerData.pos_z
                });
            }
        }
    }

    void SpawnRemotePlayer(PlayerJoinedData data)
    {
        if (data.characterId == localCharacterId) return;
        if (playerManager.HasPlayer(data.characterId)) return;
        
        Vector3 position = new Vector3(data.posX, data.posY, data.posZ);
        
        // Garantir posição Y válida
        if (position.y < 0) position.y = 0;
        
        // Criar dados do personagem para o NetworkPlayerManager
        CharacterData characterData = new CharacterData
        {
            id = data.characterId,
            name = data.name,
            classe = data.classe,
            race = data.race,
            level = data.level,
            pos_x = data.posX,
            pos_y = data.posY,
            pos_z = data.posZ
        };
        
        GameObject remotePlayer = playerManager.SpawnPlayer(characterData, position, false);
        
        // Configurar prefab específico se definido
        if (remotePlayerPrefab != null && remotePlayer.name != remotePlayerPrefab.name)
        {
            // Substituir pelo prefab correto se necessário
            Vector3 pos = remotePlayer.transform.position;
            Quaternion rot = remotePlayer.transform.rotation;
            
            playerManager.RemovePlayer(data.characterId);
            
            GameObject newRemotePlayer = Instantiate(remotePlayerPrefab, pos, rot);
            var controller = newRemotePlayer.GetComponent<PlayerController>();
            controller.isLocalPlayer = false;
            controller.SetCharacterData(characterData);
            controller.SetPlayerName(data.name);
        }
        
        Debug.Log($"Jogador remoto spawnou: {data.name} na posição {position}");
    }

    void SpawnMonsters(MonsterData[] monsters)
    {
        if (monsters == null) return;
        
        Debug.Log($"Spawnando {monsters.Length} monstros");
        
        foreach (var monster in monsters)
        {
            string monsterId = monster.id.ToString();
            
            if (!enemies.ContainsKey(monsterId))
            {
                Vector3 position = new Vector3(monster.pos_x, monster.pos_y, monster.pos_z);
                if (position.y < 0) position.y = 0;
                
                GameObject monsterObj = Instantiate(enemyPrefab, position, Quaternion.identity);
                enemies.Add(monsterId, monsterObj);
                
                Debug.Log($"Monster spawnou: {monster.name} na posição {position}");
            }
        }
    }

    void RemovePlayer(string characterId)
    {
        playerManager.RemovePlayer(characterId);
    }

    void UpdatePlayerPosition(string characterId, float x, float y, float z)
    {
        Vector3 newPosition = new Vector3(x, y, z);
        playerManager.UpdatePlayerPosition(characterId, newPosition);
    }

    void HandleCombatUpdate(CombatUpdateData data)
    {
        Debug.Log($"Combate: {data.result} - Dano: {data.damage}");
        // Implementar efeitos visuais de combate aqui
    }

    // Método público para o PlayerController notificar movimento
    public void NotifyPlayerMovement(Vector3 position, string mapName)
    {
        var moveData = new
        {
            posX = position.x,
            posY = position.y,
            posZ = position.z,
            map = mapName
        };
        
        SocketIOManager.Instance.Emit("move", moveData);
    }

    public void AttackTarget(string targetId, string targetType)
    {
        var attackData = new AttackRequest
        {
            targetId = targetId,
            targetType = targetType
        };
        
        SocketIOManager.Instance.Emit("attack", attackData);
    }

    // Getters públicos
    public GameObject GetLocalPlayer()
    {
        return localPlayer;
    }
    
    public string GetLocalCharacterId()
    {
        return localCharacterId;
    }
    
    public bool IsLocalPlayer(string characterId)
    {
        return characterId == localCharacterId;
    }

    // Classes de dados (mesmo conteúdo do anterior)
    [System.Serializable]
    public class EnterWorldResponse
    {
        public bool success;
        public string error;
        public CharacterData character;
        public SpawnInfo spawnInfo;
    }

    [System.Serializable]
    public class SpawnInfo
    {
        public float x;
        public float y;
        public float z;
        public string map;
        public NearbyPlayerData[] nearbyPlayers;
        public MonsterData[] monsters;
    }

    [System.Serializable]
    public class NearbyPlayerData
    {
        public string characterId;
        public string name;
        public string classe;
        public string race;
        public int level;
        public float pos_x;
        public float pos_y;
        public float pos_z;
    }

    [System.Serializable]
    public class MonsterData
    {
        public int id;
        public string name;
        public int level;
        public int hp;
        public int max_hp;
        public float pos_x;
        public float pos_y;
        public float pos_z;
        public string map;
    }

    [System.Serializable]
    public class CharacterData
    {
        public string id;
        public string name;
        public string classe;
        public string race;
        public int level;
        public int exp;
        public int str;
        public int dex;
        public int vit;
        public int @int;
        public int luk;
        public int hp;
        public int max_hp;
        public int mp;
        public int max_mp;
        public float pos_x;
        public float pos_y;
        public float pos_z;
        public string map;
    }

    [System.Serializable]
    public class PlayerJoinedData
    {
        public string characterId;
        public string name;
        public string classe;
        public string race;
        public int level;
        public float posX;
        public float posY;
        public float posZ;
    }

    [System.Serializable]
    public class PlayerLeftData
    {
        public string characterId;
        public string name;
    }

    [System.Serializable]
    public class PlayerMovedData
    {
        public string characterId;
        public float posX;
        public float posY;
        public float posZ;
        public string map;
    }

    [System.Serializable]
    public class CombatUpdateData
    {
        public string attackerId;
        public string targetId;
        public string targetType;
        public string result;
        public int damage;
        public bool isCritical;
        public int monsterHp;
    }

    [System.Serializable]
    public class AttackRequest
    {
        public string targetId;
        public string targetType;
    }
}