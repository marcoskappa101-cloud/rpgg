using UnityEngine;
using TMPro;
using System.Collections;

public class PlayerController : MonoBehaviour
{
    [Header("Player Settings")]
    public float moveSpeed = 5f;
    public float rotationSpeed = 10f;
    public float clickRange = 1f; // Distância mínima para considerar que chegou ao destino
    
    [Header("UI References")]
    public TextMeshPro nameTag;
    public Canvas healthBarCanvas; // Canvas para barra de vida se houver
    
    [Header("Visual Feedback")]
    public GameObject clickIndicatorPrefab; // Indicador visual do clique
    public LayerMask groundLayerMask = -1; // Layer do chão
    
    private CharacterController characterController;
    private Vector3 targetPosition;
    private bool isMoving = false;
    private bool hasTarget = false;
    private GameManager.CharacterData characterData;
    
    [HideInInspector]
    public bool isLocalPlayer = false;
    
    private Camera playerCamera;
    private GameObject clickIndicator;
    private float lastMoveNotificationTime = 0f;
    private float moveNotificationInterval = 0.1f; // Notificar servidor a cada 100ms
    
    // 🔹 Para jogadores remotos - interpolação suave
    private Vector3 networkPosition;
    private Vector3 networkVelocity;
    private bool hasNetworkTarget = false;
    private float networkMoveSpeed = 5f;
    
    void Awake()
    {
        characterController = GetComponent<CharacterController>();
        
        if (nameTag == null)
        {
            nameTag = GetComponentInChildren<TextMeshPro>();
        }
        
        // Configurar canvas da barra de vida para sempre olhar para a câmera
        if (healthBarCanvas != null)
        {
            healthBarCanvas.worldCamera = Camera.main;
        }
    }
    
    void Start()
    {
        targetPosition = transform.position;
        networkPosition = transform.position; // 🔹 inicializar posição de rede
        
        if (isLocalPlayer)
        {
            playerCamera = Camera.main;
            
            // Criar indicador de clique se não existir
            if (clickIndicatorPrefab != null && clickIndicator == null)
            {
                clickIndicator = Instantiate(clickIndicatorPrefab);
                clickIndicator.SetActive(false);
            }
        }
    }
    
    void Update()
    {
        if (isLocalPlayer)
        {
            HandleInput();
            HandleMovement();
        }
        else
        {
            HandleNetworkMovement(); // 🔹 Movimento para jogadores remotos
        }
        
        UpdateUI();
    }
    
    void HandleInput()
    {
        // Clique esquerdo para movimento
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = playerCamera.ScreenPointToRay(Input.mousePosition);
            RaycastHit hit;
            
            if (Physics.Raycast(ray, out hit, Mathf.Infinity, groundLayerMask))
            {
                SetDestination(hit.point);
                ShowClickIndicator(hit.point);
            }
        }
        
        // Clique direito para cancelar movimento (opcional)
        if (Input.GetMouseButtonDown(1))
        {
            StopMovement();
        }
    }
    
    void HandleMovement()
    {
        if (!isMoving || !hasTarget) return;
        
        Vector3 direction = (targetPosition - transform.position).normalized;
        float distance = Vector3.Distance(transform.position, targetPosition);
        
        // Verificar se chegou ao destino
        if (distance < clickRange)
        {
            StopMovement();
            return;
        }
        
        // Mover o personagem
        Vector3 movement = direction * moveSpeed * Time.deltaTime;
        
        // Aplicar gravidade simples se usar CharacterController
        if (characterController != null)
        {
            movement.y = -9.81f * Time.deltaTime; // Gravidade
            characterController.Move(movement);
        }
        else
        {
            transform.Translate(movement, Space.World);
        }
        
        // Rotacionar na direção do movimento
        if (direction.magnitude > 0.1f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(direction);
            transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
        }
        
        // Notificar servidor sobre movimento (apenas jogador local)
        if (isLocalPlayer && Time.time - lastMoveNotificationTime > moveNotificationInterval)
        {
            NotifyServerMovement();
            lastMoveNotificationTime = Time.time;
        }
    }
    
    // 🔹 Movimento suave para jogadores remotos
    void HandleNetworkMovement()
    {
        if (!hasNetworkTarget) return;
        
        float distance = Vector3.Distance(transform.position, networkPosition);
        
        // Se a distância é muito grande, teleportar
        if (distance > 10f)
        {
            if (characterController != null)
            {
                characterController.enabled = false;
                transform.position = networkPosition;
                characterController.enabled = true;
            }
            else
            {
                transform.position = networkPosition;
            }
            hasNetworkTarget = false;
            return;
        }
        
        // Movimento suave
        if (distance > 0.1f)
        {
            Vector3 direction = (networkPosition - transform.position).normalized;
            Vector3 movement = direction * networkMoveSpeed * Time.deltaTime;
            
            if (characterController != null)
            {
                movement.y = -9.81f * Time.deltaTime;
                characterController.Move(movement);
            }
            else
            {
                transform.position = Vector3.MoveTowards(transform.position, networkPosition, networkMoveSpeed * Time.deltaTime);
            }
            
            // Rotacionar na direção do movimento
            if (direction.magnitude > 0.1f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(direction);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, rotationSpeed * Time.deltaTime);
            }
        }
        else
        {
            hasNetworkTarget = false;
        }
    }
    
    void SetDestination(Vector3 destination)
    {
        targetPosition = destination;
        targetPosition.y = transform.position.y; // Manter altura do jogador
        hasTarget = true;
        isMoving = true;
        
        Debug.Log($"Destino definido: {targetPosition}");
    }
    
    void StopMovement()
    {
        isMoving = false;
        hasTarget = false;
        
        if (clickIndicator != null)
        {
            clickIndicator.SetActive(false);
        }
    }
    
    void ShowClickIndicator(Vector3 position)
    {
        if (clickIndicator != null)
        {
            clickIndicator.transform.position = position;
            clickIndicator.SetActive(true);
            
            // Esconder após alguns segundos
            StartCoroutine(HideClickIndicatorAfterDelay(2f));
        }
    }
    
    IEnumerator HideClickIndicatorAfterDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        
        if (clickIndicator != null)
        {
            clickIndicator.SetActive(false);
        }
    }
    
    void NotifyServerMovement()
    {
        if (GameManager.Instance != null)
        {
            string currentMap = characterData != null ? characterData.map : "village_of_gludin";
            GameManager.Instance.NotifyPlayerMovement(transform.position, currentMap);
        }
    }
    
    void UpdateUI()
    {
        // Fazer barra de vida sempre olhar para a câmera
        if (healthBarCanvas != null && Camera.main != null)
        {
            healthBarCanvas.transform.LookAt(Camera.main.transform);
            healthBarCanvas.transform.Rotate(0, 180, 0); // Corrigir rotação
        }
    }
    
    // Método público para ser chamado por outros jogadores via rede
    public void MoveToPosition(Vector3 position, bool notifyServer = true)
    {
        if (isLocalPlayer && notifyServer)
        {
            // Se for jogador local, usar o sistema de clique
            SetDestination(position);
        }
        else
        {
            // 🔹 Jogador remoto usa interpolação
            networkPosition = position;
            hasNetworkTarget = true;
        }
    }
    
    public void SetPlayerName(string name)
    {
        if (nameTag != null)
        {
            nameTag.text = name;
        }
    }
    
    public void SetCharacterData(GameManager.CharacterData data)
    {
        characterData = data;
        
        if (nameTag != null)
        {
            nameTag.text = data.name;
        }
        
        // Configurar outros dados do personagem se necessário
        // como HP, MP, level, etc.
    }
    
    // Método para atacar (expandir no futuro)
    public void Attack(GameObject target)
    {
        if (target != null)
        {
            Debug.Log($"Atacando: {target.name}");
            // Implementar lógica de ataque
        }
    }
    
    // Getter para posição atual
    public Vector3 GetPosition()
    {
        return transform.position;
    }
    
    // Getter para verificar se está se movendo
    public bool IsMoving()
    {
        return isMoving;
    }
    // 🔹 Forçar sincronização de posição (teleporte instantâneo)
public void SyncPosition(Vector3 position)
{
    if (characterController != null)
    {
        characterController.enabled = false;
        transform.position = position;
        characterController.enabled = true;
    }
    else
    {
        transform.position = position;
    }

    // Resetar interpolação
    networkPosition = position;
    hasNetworkTarget = false;
}
    void OnDrawGizmosSelected()
    {
        // Desenhar destino no editor
        if (hasTarget)
        {
            Gizmos.color = Color.red;
            Gizmos.DrawWireSphere(targetPosition, 0.5f);
            
            Gizmos.color = Color.blue;
            Gizmos.DrawLine(transform.position, targetPosition);
        }
        
        // Desenhar alcance do clique
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, clickRange);
    }
}
