using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using SocketIOClient;

public class AuthManager : MonoBehaviour
{
    [Header("UI References")]
    public GameObject loginPanel;
    public GameObject registerPanel;
    public GameObject serverSelectionPanel;
    public GameObject characterSelectionPanel;
    
    public TMP_InputField loginUsername;
    public TMP_InputField loginPassword;
    public TMP_InputField registerUsername;
    public TMP_InputField registerPassword;
    public TMP_InputField registerConfirmPassword;
    
    public Button loginButton;
    public Button registerButton;
    public Button showRegisterButton;
    public Button showLoginButton;

    [Header("Server Selection UI")]
    public Transform serverListContainer;
    public GameObject serverButtonPrefab;
    
    [Header("Refresh Settings")]
    public Button refreshServersButton; // Adicionar um botão de refresh se desejar

    // Variáveis para armazenar callbacks da thread
    private System.Action uiAction;
    private bool hasUIAction = false;

    void Start()
    {
        SetupUI();
        SetupSocketEvents();
        
        if (characterSelectionPanel != null) {
            characterSelectionPanel.SetActive(false);
        }
    }

    void Update()
    {
        // Executar ações de UI na thread principal
        if (hasUIAction && uiAction != null)
        {
            uiAction.Invoke();
            uiAction = null;
            hasUIAction = false;
        }
    }

    void SetupUI()
    {
        loginButton.onClick.AddListener(OnLoginClicked);
        registerButton.onClick.AddListener(OnRegisterClicked);
        showRegisterButton.onClick.AddListener(ShowRegisterPanel);
        showLoginButton.onClick.AddListener(ShowLoginPanel);
        
        // Adicionar listener para botão de refresh se existir
        if (refreshServersButton != null)
        {
            refreshServersButton.onClick.AddListener(RefreshServerList);
        }
        
        ShowLoginPanel();
    }

    void SetupSocketEvents()
    {
        SocketIOManager.Instance.OnConnected += () =>
        {
            Debug.Log("Pronto para autenticar");
        };
        
        SocketIOManager.Instance.On("login_response", (response) =>
        {
            try
            {
                string rawResponse = SocketIOManager.GetResponseAsString(response);
                Debug.Log("Resposta bruta do servidor: " + rawResponse);
                
                var data = SocketIOManager.GetData<LoginResponse>(response);
                if (data != null)
                {
                    if (data.success)
                    {
                        Debug.Log("Login bem-sucedido! Account ID: " + data.account.id);
                        SocketIOManager.Instance.accountId = data.account.id;
                        SocketIOManager.Instance.sessionToken = data.account.username;
                        
                        uiAction = () => ShowServerSelection();
                        hasUIAction = true;
                    }
                    else
                    {
                        Debug.LogError("Erro no login: " + data.error);
                    }
                }
                else
                {
                    Debug.LogError("Resposta inválida do servidor - data é null");
                }
            }	
            catch (Exception ex)
            {
                Debug.LogError("Erro ao processar login_response: " + ex.Message);
            }
        });
        
        SocketIOManager.Instance.On("register_response", (response) =>
        {
            try
            {
                string rawResponse = SocketIOManager.GetResponseAsString(response);
                Debug.Log("Resposta bruta do servidor: " + rawResponse);
                
                var data = SocketIOManager.GetData<RegisterResponse>(response);
                if (data != null)
                {
                    if (data.success)
                    {
                        Debug.Log("Registro bem-sucedido! Account ID: " + data.accountId);
                        
                        uiAction = () => {
                            ShowLoginPanel();
                            loginUsername.text = registerUsername.text;
                        };
                        hasUIAction = true;
                    }
                    else
                    {
                        Debug.LogError("Erro no registro: " + data.error);
                    }
                }
                else
                {
                    Debug.LogError("Resposta inválida do servidor - data é null");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("Erro ao processar register_response: " + ex.Message);
            }
        });

        // Handler corrigido para resposta de servidores
        SocketIOManager.Instance.On("get_servers_response", (response) =>
        {
            try
            {
                string rawResponse = SocketIOManager.GetResponseAsString(response);
                Debug.Log("Resposta servidores: " + rawResponse);
                
                var data = SocketIOManager.GetData<ServerListResponse>(response);
                if (data != null)
                {
                    if (data.success)
                    {
                        Debug.Log("Servidores carregados: " + data.servers.Count);
                        
                        // FORÇAR atualização imediata da UI
                        uiAction = () => {
                            // Limpar cache anterior
                            ClearServerList();
                            // Popular com dados frescos
                            PopulateServerList(data.servers.ToArray());
                        };
                        hasUIAction = true;
                    }
                    else
                    {
                        Debug.LogError("Erro ao carregar servidores: " + data.error);
                    }
                }
                else
                {
                    Debug.LogError("Resposta inválida do servidor - data é null");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("Erro ao processar get_servers_response: " + ex.Message);
            }
        });
    }

    // Método para limpar lista de servidores
    void ClearServerList()
    {
        foreach (Transform child in serverListContainer)
        {
            Destroy(child.gameObject);
        }
    }

    void PopulateServerList(ServerInfo[] servers)
    {
        // Garantir que a lista está limpa
        ClearServerList();
        
        // Adicionar servidores à lista com dados atualizados
        foreach (var server in servers)
        {
            Debug.Log($"Adicionando servidor: {server.name} - Jogadores: {server.playerCount}/{server.maxPlayers}");
            
            var serverButtonObj = Instantiate(serverButtonPrefab, serverListContainer);
            var serverButton = serverButtonObj.GetComponent<ServerButton>();
            
            if (serverButton != null)
            {
                serverButton.Setup(server, OnServerSelected);
            }
        }
        
        // Força o Canvas a atualizar
        Canvas.ForceUpdateCanvases();
    }

    // Método para atualizar manualmente a lista de servidores
    public void RefreshServerList()
    {
        Debug.Log("Atualizando lista de servidores...");
        SocketIOManager.Instance.Emit("get_servers");
    }

    void OnServerSelected(ServerInfo server)
    {
        Debug.Log("Servidor selecionado: " + server.name);
        
        // Salvar o ID do servidor selecionado
        PlayerPrefs.SetInt("SelectedServerId", server.id);
        PlayerPrefs.SetString("SelectedServerName", server.name);
        
        // Desativar o painel de seleção de servidor
        if (serverSelectionPanel != null) {
            serverSelectionPanel.SetActive(false);
        }
        
        // Ativar o painel de seleção/criação de personagem
        if (characterSelectionPanel != null) {
            characterSelectionPanel.SetActive(true);
            // O CharacterManager deve ser notificado para carregar os personagens
            CharacterManager.Instance?.LoadCharacters();
        } else {
            Debug.LogWarning("characterSelectionPanel não está atribuído. Certifique-se de arrastar o Canvas correto no Inspector.");
        }
    }

    void OnLoginClicked()
    {
        if (string.IsNullOrEmpty(loginUsername.text) || string.IsNullOrEmpty(loginPassword.text))
        {
            Debug.LogError("Preencha todos os campos");
            return;
        }
        
        var loginData = new Dictionary<string, string>
        {
            { "username", loginUsername.text.Trim() },
            { "password", loginPassword.text }
        };
        
        Debug.Log("Enviando login: " + SocketIOManager.ToJson(loginData));
        SocketIOManager.Instance.Emit("login", loginData);
    }

    void OnRegisterClicked()
    {
        if (string.IsNullOrEmpty(registerUsername.text) || 
            string.IsNullOrEmpty(registerPassword.text) || 
            string.IsNullOrEmpty(registerConfirmPassword.text))
        {
            Debug.LogError("Preencha todos os campos");
            return;
        }
        
        if (registerPassword.text != registerConfirmPassword.text)
        {
            Debug.LogError("As senhas não coincidem");
            return;
        }
        
        if (registerPassword.text.Length < 6)
        {
            Debug.LogError("A senha deve ter pelo menos 6 caracteres");
            return;
        }
        
        var registerData = new Dictionary<string, string>
        {
            { "username", registerUsername.text.Trim() },
            { "password", registerPassword.text }
        };
        
        Debug.Log("Enviando registro: " + SocketIOManager.ToJson(registerData));
        SocketIOManager.Instance.Emit("register", registerData);
    }

    void ShowLoginPanel()
    {
        loginPanel.SetActive(true);
        registerPanel.SetActive(false);
        serverSelectionPanel.SetActive(false);
        if (characterSelectionPanel != null) characterSelectionPanel.SetActive(false);
        
        // Limpar campos
        loginPassword.text = "";
        registerUsername.text = "";
        registerPassword.text = "";
        registerConfirmPassword.text = "";
    }

    void ShowRegisterPanel()
    {
        loginPanel.SetActive(false);
        registerPanel.SetActive(true);
        serverSelectionPanel.SetActive(false);
        if (characterSelectionPanel != null) characterSelectionPanel.SetActive(false);
    }

    void ShowServerSelection()
    {
        loginPanel.SetActive(false);
        registerPanel.SetActive(false);
        serverSelectionPanel.SetActive(true);
        if (characterSelectionPanel != null) characterSelectionPanel.SetActive(false);
        
        // SEMPRE buscar servidores frescos quando mostrar o painel
        Debug.Log("Buscando servidores atualizados...");
        SocketIOManager.Instance.Emit("get_servers");
    }

    [System.Serializable]
    public class LoginResponse
    {
        public bool success;
        public string error;
        public AccountData account;
    }

    [System.Serializable]
    public class RegisterResponse
    {
        public bool success;
        public string error;
        public string accountId;
    }

    [System.Serializable]
    public class AccountData
    {
        public string id;
        public string username;
        public string created_at;
    }
}