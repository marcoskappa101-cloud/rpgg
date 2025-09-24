using UnityEngine;
using System.Collections.Generic;

public class NetworkPlayerManager : MonoBehaviour
{
    public static NetworkPlayerManager Instance;
    
    [Header("Player Prefabs")]
    public GameObject[] playerPrefabsByRace;
    public GameObject[] playerPrefabsByClass;
    public GameObject defaultPlayerPrefab;
    
    [Header("Name Tag Settings")]
    public GameObject nameTagPrefab;
    public float nameTagHeight = 2.5f;
    
    [Header("Player Colors")]
    public Color localPlayerColor = Color.blue;
    public Color remotePlayerColor = Color.white;
    public Color friendlyPlayerColor = Color.green;
    public Color enemyPlayerColor = Color.red;
    
    private Dictionary<string, GameObject> spawnedPlayers = new Dictionary<string, GameObject>();
    
    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    public GameObject SpawnPlayer(GameManager.CharacterData characterData, Vector3 position, bool isLocal = false)
    {
        // 🔹 Verificar se já existe um jogador com esse ID
        if (spawnedPlayers.ContainsKey(characterData.id))
        {
            Debug.LogWarning($"Jogador {characterData.name} já existe! Removendo duplicata.");
            RemovePlayer(characterData.id);
        }
        
        GameObject prefabToUse = GetPrefabForCharacter(characterData);
        GameObject playerObject = Instantiate(prefabToUse, position, Quaternion.identity);
        
        // 🔹 Definir nome do objeto para debug
        playerObject.name = $"{characterData.name}_{(isLocal ? "Local" : "Remote")}";
        
        PlayerController playerController = playerObject.GetComponent<PlayerController>();
        if (playerController == null)
        {
            playerController = playerObject.AddComponent<PlayerController>();
        }
        
        playerController.isLocalPlayer = isLocal;
        playerController.SetCharacterData(characterData);
        playerController.SetPlayerName(characterData.name);
        
        ConfigurePlayerVisual(playerObject, characterData, isLocal);
        CreateNameTag(playerObject, characterData.name);
        
        // 🔹 Adicionar à lista
        spawnedPlayers[characterData.id] = playerObject;
        
        Debug.Log($"Jogador spawnou: {characterData.name} ({characterData.id}) - Local: {isLocal} - Posição: {position}");
        
        return playerObject;
    }
    
    GameObject GetPrefabForCharacter(GameManager.CharacterData characterData)
    {
        GameObject prefab = GetPrefabByRace(characterData.race);
        if (prefab != null) return prefab;
        
        prefab = GetPrefabByClass(characterData.classe);
        if (prefab != null) return prefab;
        
        return defaultPlayerPrefab;
    }
    
    GameObject GetPrefabByRace(string race)
    {
        if (playerPrefabsByRace == null || playerPrefabsByRace.Length == 0) return null;
        
        int raceIndex = race switch
        {
            "human" => 0,
            "elf" => 1,
            "dark_elf" => 2,
            "orc" => 3,
            "dwarf" => 4,
            _ => -1
        };
        
        if (raceIndex >= 0 && raceIndex < playerPrefabsByRace.Length)
        {
            return playerPrefabsByRace[raceIndex];
        }
        
        return null;
    }
    
    GameObject GetPrefabByClass(string characterClass)
    {
        if (playerPrefabsByClass == null || playerPrefabsByClass.Length == 0) return null;
        
        int classIndex = characterClass switch
        {
            "warrior" => 0,
            "mage" => 1,
            "archer" => 2,
            "rogue" => 3,
            "cleric" => 4,
            _ => -1
        };
        
        if (classIndex >= 0 && classIndex < playerPrefabsByClass.Length)
        {
            return playerPrefabsByClass[classIndex];
        }
        
        return null;
    }
    
    void ConfigurePlayerVisual(GameObject playerObject, GameManager.CharacterData characterData, bool isLocal)
    {
        Renderer[] renderers = playerObject.GetComponentsInChildren<Renderer>();
        Color playerColor = isLocal ? localPlayerColor : remotePlayerColor;
        
        foreach (Renderer renderer in renderers)
        {
            if (renderer.material != null)
            {
                if (renderer.material.HasProperty("_Color"))
                {
                    renderer.material.color = playerColor;
                }
                else if (renderer.material.HasProperty("_BaseColor"))
                {
                    renderer.material.SetColor("_BaseColor", playerColor);
                }
            }
        }
        
        if (isLocal)
        {
            playerObject.tag = "Player";
            playerObject.layer = LayerMask.NameToLayer("Player");
        }
        else
        {
            playerObject.tag = "RemotePlayer";
            playerObject.layer = LayerMask.NameToLayer("RemotePlayer");
        }
    }
    
    void CreateNameTag(GameObject playerObject, string playerName)
    {
        if (nameTagPrefab == null) return;
        
        GameObject nameTag = Instantiate(nameTagPrefab, playerObject.transform);
        nameTag.transform.localPosition = Vector3.up * nameTagHeight;
        
        TMPro.TextMeshPro textMesh = nameTag.GetComponent<TMPro.TextMeshPro>();
        if (textMesh == null)
        {
            textMesh = nameTag.GetComponentInChildren<TMPro.TextMeshPro>();
        }
        
        if (textMesh != null)
        {
            textMesh.text = playerName;
            textMesh.alignment = TMPro.TextAlignmentOptions.Center;
            textMesh.fontSize = 3;
        }
        
        Billboard billboard = nameTag.GetComponent<Billboard>();
        if (billboard == null)
        {
            billboard = nameTag.AddComponent<Billboard>();
        }
    }
    
    public void RemovePlayer(string characterId)
    {
        if (spawnedPlayers.ContainsKey(characterId))
        {
            GameObject playerObj = spawnedPlayers[characterId];
            Debug.Log($"Removendo jogador: {playerObj.name} ({characterId})");
            
            Destroy(playerObj);
            spawnedPlayers.Remove(characterId);
        }
        else
        {
            Debug.LogWarning($"Tentativa de remover jogador inexistente: {characterId}");
        }
    }
    
    public GameObject GetPlayer(string characterId)
    {
        return spawnedPlayers.ContainsKey(characterId) ? spawnedPlayers[characterId] : null;
    }
    
    // 🔹 ATUALIZADO: Método para atualizar posição do jogador
    public void UpdatePlayerPosition(string characterId, Vector3 position)
    {
        GameObject player = GetPlayer(characterId);
        if (player != null)
        {
            PlayerController controller = player.GetComponent<PlayerController>();
            if (controller != null && !controller.isLocalPlayer)
            {
                // 🔹 Usar movimento suave para jogadores remotos
                controller.MoveToPosition(position, false);
                
                Debug.Log($"Atualizando posição de {player.name}: {position}");
            }
            else if (controller != null && controller.isLocalPlayer)
            {
                Debug.Log($"Ignorando atualização de posição para jogador local: {player.name}");
            }
        }
        else
        {
            Debug.LogWarning($"Jogador não encontrado para atualizar posição: {characterId}");
            // 🔹 Debug: Listar jogadores existentes
            Debug.Log($"Jogadores existentes: {string.Join(", ", spawnedPlayers.Keys)}");
        }
    }
    
    // 🔹 NOVO: Método para sincronizar posição instantaneamente (útil para spawn)
    public void SyncPlayerPosition(string characterId, Vector3 position)
    {
        GameObject player = GetPlayer(characterId);
        if (player != null)
        {
            PlayerController controller = player.GetComponent<PlayerController>();
            if (controller != null && !controller.isLocalPlayer)
            {
                controller.SyncPosition(position);
            }
        }
    }
    
    public bool HasPlayer(string characterId)
    {
        return spawnedPlayers.ContainsKey(characterId);
    }
    
    public int GetPlayerCount()
    {
        return spawnedPlayers.Count;
    }
    
    // 🔹 NOVO: Método para debug - listar todos os jogadores
    public void DebugListPlayers()
    {
        Debug.Log($"=== Lista de Jogadores ({spawnedPlayers.Count}) ===");
        foreach (var kvp in spawnedPlayers)
        {
            var player = kvp.Value;
            var controller = player.GetComponent<PlayerController>();
            Debug.Log($"ID: {kvp.Key} | Nome: {player.name} | Local: {controller?.isLocalPlayer} | Posição: {player.transform.position}");
        }
    }
    
    public Dictionary<string, GameObject> GetAllPlayers()
    {
        return new Dictionary<string, GameObject>(spawnedPlayers);
    }
}