using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;

public class ServerButton : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI serverNameText;
    [SerializeField] private TextMeshProUGUI serverStatusText;
    [SerializeField] private TextMeshProUGUI playerCountText;
    [SerializeField] private Button button;
    
    private ServerInfo serverData;
    private Action<ServerInfo> onSelectCallback;

    public void Setup(ServerInfo data, Action<ServerInfo> onSelect)
    {
        serverData = data;
        onSelectCallback = onSelect;
        
        serverNameText.text = data.name;
        serverStatusText.text = GetStatusDisplayName(data.status);
        playerCountText.text = $"{data.playerCount}/{data.maxPlayers}";
        
        // Configurar cor baseada no status
        var statusColor = data.status == "online" ? Color.green : 
                         data.status == "maintenance" ? Color.yellow : Color.gray;
        serverStatusText.color = statusColor;
        
        button.onClick.RemoveAllListeners();
        button.onClick.AddListener(OnButtonClicked);
    }

    void OnButtonClicked()
    {
        onSelectCallback?.Invoke(serverData);
    }

    string GetStatusDisplayName(string status)
    {
        return status switch
        {
            "online" => "Online",
            "offline" => "Offline",
            "maintenance" => "Manutenção",
            _ => status
        };
    }
}	
