using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SocketIOClient;
using UnityEngine.SceneManagement;

public class CharacterManager : MonoBehaviour
{
    public static CharacterManager Instance;

    [Header("UI References")]
    public GameObject characterSelectionPanel;
    public GameObject characterCreationPanel;
    public Transform characterListContainer;
    public GameObject characterButtonPrefab;

    public TMP_InputField characterNameInput;
    public TMP_Dropdown classDropdown;
    public TMP_Dropdown raceDropdown;
    public Button createCharacterButton;

    public List<CharacterData> characters = new List<CharacterData>();

    // 🔹 Propriedade pública para acessar o ID do personagem selecionado
    public string characterId { get; private set; }

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

    void Start()
    {
        SetupUI();
        SetupSocketEvents();

        if (characterCreationPanel != null)
            characterCreationPanel.SetActive(false);

        if (characterSelectionPanel != null && characterSelectionPanel.activeSelf)
            LoadCharacters();
    }

    void SetupUI()
    {
        createCharacterButton.onClick.AddListener(OnCreateCharacterClicked);

        classDropdown.ClearOptions();
        classDropdown.AddOptions(new List<string> { "Guerreiro", "Mago", "Arqueiro", "Ladino", "Clérigo" });

        raceDropdown.ClearOptions();
        raceDropdown.AddOptions(new List<string> { "Humano", "Elfo", "Elfo Negro", "Orc", "Anão" });
    }

    void SetupSocketEvents()
    {
        SocketIOManager.Instance.On("get_characters_response", (response) =>
        {
            var data = SocketIOManager.GetData<CharactersResponse>(response);

            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.success)
                {
                    characters = data.characters;

                    Debug.Log($"Recebidos {characters.Count} personagens:");
                    foreach (var character in characters)
                    {
                        Debug.Log($"ID: '{character.id}', Nome: '{character.name}'");
                    }

                    PopulateCharacterList();
                }
                else
                {
                    Debug.LogError("Erro ao carregar personagens: " + data.error);
                }
            });
        });

        SocketIOManager.Instance.On("create_character_response", (response) =>
        {
            var data = SocketIOManager.GetData<CreateCharacterResponse>(response);

            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.success)
                {
                    Debug.Log("Personagem criado com sucesso! ID: " + data.characterId);
                    LoadCharacters();
                    ShowCharacterSelection();
                }
                else
                {
                    Debug.LogError("Erro ao criar personagem: " + data.error);
                }
            });
        });

        SocketIOManager.Instance.On("select_character_response", (response) =>
        {
            var data = SocketIOManager.GetData<SelectCharacterResponse>(response);

            MainThreadDispatcher.Enqueue(() =>
            {
                if (data.success)
                {
                    if (data.character == null || string.IsNullOrEmpty(data.character.id))
                    {
                        Debug.LogError("Dados do personagem retornado são inválidos");
                        Debug.LogError($"Character null: {data.character == null}");
                        if (data.character != null)
                            Debug.LogError($"Character ID: '{data.character.id}'");
                        return;
                    }

                    Debug.Log("Personagem selecionado: " + data.character.name + " (ID: " + data.character.id + ")");

                    // 🔹 Salvar ID tanto no CharacterManager quanto no SocketIOManager
                    characterId = data.character.id;
                    SocketIOManager.Instance.characterId = data.character.id;

                    EnterGameWorld();
                }
                else
                {
                    Debug.LogError("Erro ao selecionar personagem: " + data.error);
                }
            });
        });
    }

    public void LoadCharacters()
    {
        Debug.Log("Carregando personagens...");
        SocketIOManager.Instance.Emit("get_characters");
    }

    public void PopulateCharacterList()
    {
        foreach (Transform child in characterListContainer)
            Destroy(child.gameObject);

        foreach (var character in characters)
        {
            var buttonObj = Instantiate(characterButtonPrefab, characterListContainer);
            var button = buttonObj.GetComponent<CharacterButton>();
            button.Setup(character, OnCharacterSelected);
        }

        var createButtonObj = Instantiate(characterButtonPrefab, characterListContainer);
        var createButton = createButtonObj.GetComponent<CharacterButton>();
        createButton.SetupAsCreateButton(OnCreateNewCharacterClicked);
    }

    void OnCharacterSelected(CharacterData character)
    {
        Debug.Log($"Tentando selecionar personagem: {character.name} com ID: '{character.id}'");

        if (character == null)
        {
            Debug.LogError("Character data is null");
            return;
        }

        if (string.IsNullOrEmpty(character.id))
        {
            Debug.LogError($"Não é possível selecionar personagem: ID vazio. Nome: {character.name}");
            return;
        }

        // 🔹 Definir ID local
        characterId = character.id;

        var selectData = new
        {
            characterId = character.id
        };

        Debug.Log($"Enviando select_character com characterId: '{character.id}'");
        SocketIOManager.Instance.Emit("select_character", selectData);
    }

    void OnCreateNewCharacterClicked()
    {
        ShowCharacterCreation();
    }

    void OnCreateCharacterClicked()
    {
        if (string.IsNullOrEmpty(characterNameInput.text))
        {
            Debug.LogError("Digite um nome para o personagem");
            return;
        }

        string classValue = classDropdown.value switch
        {
            0 => "warrior",
            1 => "mage",
            2 => "archer",
            3 => "rogue",
            4 => "cleric",
            _ => "warrior"
        };

        string raceValue = raceDropdown.value switch
        {
            0 => "human",
            1 => "elf",
            2 => "dark_elf",
            3 => "orc",
            4 => "dwarf",
            _ => "human"
        };

        var data = new
        {
            name = characterNameInput.text,
            classe = classValue,
            race = raceValue
        };

        Debug.Log($"Enviando dados de criação: Nome='{data.name}', Classe='{data.classe}', Raça='{data.race}'");
        SocketIOManager.Instance.Emit("create_character", data);
    }

    public void ShowCharacterSelection()
    {
        characterSelectionPanel.SetActive(true);
        characterCreationPanel.SetActive(false);
        LoadCharacters();
    }

    public void ShowCharacterCreation()
    {
        characterSelectionPanel.SetActive(false);
        characterCreationPanel.SetActive(true);
        characterNameInput.text = "";
    }

    public void EnterGameWorld()
    {
        Debug.Log("Entrando no mundo do jogo...");
        SceneManager.LoadScene("GameScene");
    }

    [System.Serializable]
    public class CharactersResponse
    {
        public bool success;
        public string error;
        public List<CharacterData> characters;
    }

    [System.Serializable]
    public class CreateCharacterResponse
    {
        public bool success;
        public string error;
        public string characterId;
    }

    [System.Serializable]
    public class SelectCharacterResponse
    {
        public bool success;
        public string error;
        public CharacterData character;
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
}
