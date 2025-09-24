using System;
using System.Collections.Generic;

[System.Serializable]
public class ServerInfo
{
    public int id;
    public string name;
    public string status;
    public int playerCount;
    public int maxPlayers;
    public string lastUpdate;
}

[System.Serializable]
public class ServerListResponse
{
    public bool success;
    public List<ServerInfo> servers;
    public string error;
}
