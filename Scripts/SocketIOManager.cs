	using System;
	using System.Collections;
	using System.Collections.Generic;
	using UnityEngine;
	using SocketIOClient;
	using Newtonsoft.Json;
	using System.Threading.Tasks;

	public class SocketIOManager : MonoBehaviour
	{
		public static SocketIOManager Instance;
		
		public SocketIOUnity socket;
		public string serverURL = "http://localhost:3000";
		
		public bool isConnected = false;
		public string sessionToken;
		public string accountId;
		public string characterId;
		
		public event Action OnConnected;
		public event Action<string> OnDisconnected;
		public event Action<string> OnError;

		async void Awake()
		{
			if (Instance == null)
			{
				Instance = this;
				DontDestroyOnLoad(gameObject);
				await InitializeSocket();
			}
			else
			{
				Destroy(gameObject);
			}
		}

		async Task InitializeSocket()
		{
			try
			{
				// Configuração simplificada
				socket = new SocketIOUnity(new Uri(serverURL));
				
				// Eventos de conexão
				socket.OnConnected += (sender, e) =>
				{
					isConnected = true;
					Debug.Log("Conectado ao servidor");
					OnConnected?.Invoke();
				};
				
				socket.OnDisconnected += (sender, e) =>
				{
					isConnected = false;
					Debug.Log("Desconectado do servidor: " + e);
					OnDisconnected?.Invoke(e);
				};
				
				socket.OnError += (sender, e) =>
				{
					Debug.LogError("Erro na conexão: " + e);
					OnError?.Invoke(e);
				};
				
				// Conectar
				await socket.ConnectAsync();
			}
			catch (Exception ex)
			{
				Debug.LogError("Erro ao inicializar socket: " + ex.Message);
			}
		}

		public async void Emit(string eventName, object data = null)
		{
			if (socket != null && isConnected)
			{
				try
				{
					Debug.Log($"Enviando evento: {eventName} - Dados: {ToJson(data)}");
					await socket.EmitAsync(eventName, data);
					Debug.Log($"Evento {eventName} enviado com sucesso");
				}
				catch (Exception ex)
				{
					Debug.LogError($"Erro ao emitir evento {eventName}: " + ex.Message);
				}
			}
			else
			{
				Debug.LogWarning("Socket não conectado para emitir: " + eventName);
			}
		}

		public void On(string eventName, Action<SocketIOResponse> callback)
		{
			if (socket != null)
			{
				socket.On(eventName, (response) =>
				{
					try
					{
						Debug.Log($"Recebido evento: {eventName}");
						callback(response);
					}
					catch (Exception ex)
					{
						Debug.LogError($"Erro no callback do evento {eventName}: {ex.Message}");
					}
				});
			}
		}

		public void Off(string eventName)
		{
			if (socket != null)
			{
				socket.Off(eventName);
			}
		}

		async void OnDestroy()
		{
			if (socket != null && isConnected)
			{
				try
				{
					await socket.DisconnectAsync();
				}
				catch (Exception ex)
				{
					Debug.LogError("Erro ao desconectar: " + ex.Message);
				}
			}
		}

		// Método auxiliar para converter objeto para JSON
		public static string ToJson(object obj)
		{
			try
			{
				return JsonConvert.SerializeObject(obj);
			}
			catch (Exception ex)
			{
				Debug.LogError("Erro ao serializar JSON: " + ex.Message);
				return "{}";
			}
		}

		// Método auxiliar para converter JSON para objeto
		public static T FromJson<T>(string json)
		{
			try
			{
				return JsonConvert.DeserializeObject<T>(json);
			}
			catch (Exception ex)
			{
				Debug.LogError("Erro ao desserializar JSON: " + ex.Message);
				return default(T);
			}
		}

		// Método auxiliar para extrair dados do SocketIOResponse - CORRIGIDO
	public static T GetData<T>(SocketIOResponse response)
	{
		try
		{
			if (response != null)
			{
				string jsonString = response.ToString();
				Debug.Log($"Resposta JSON completa: {jsonString}");
				
				if (!string.IsNullOrEmpty(jsonString))
				{
					// Remover colchetes externos se for array duplo
					if (jsonString.StartsWith("[[") && jsonString.EndsWith("]]"))
					{
						// Array duplo: [[{...}]]
						jsonString = jsonString.Substring(1, jsonString.Length - 2);
					}
					
					// Remover colchetes se for array simples
					if (jsonString.StartsWith("[") && jsonString.EndsWith("]"))
					{
						jsonString = jsonString.Substring(1, jsonString.Length - 2);
					}
					
					return JsonConvert.DeserializeObject<T>(jsonString);
				}
			}
		}
		catch (Exception ex)
		{
			Debug.LogError("Erro ao extrair dados: " + ex.Message);
		}
		return default(T);
	}

		// Método para obter a resposta como string
		public static string GetResponseAsString(SocketIOResponse response)
		{
			try
			{
				return response.ToString();
			}
			catch (Exception ex)
			{
				Debug.LogError("Erro ao converter resposta para string: " + ex.Message);
				return string.Empty;
			}
		}
	}