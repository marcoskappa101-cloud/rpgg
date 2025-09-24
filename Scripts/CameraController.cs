using UnityEngine;

public class CameraController : MonoBehaviour
{
    [Header("Camera Settings")]
    public Transform target; // O jogador para seguir
    public Vector3 offset = new Vector3(0, 10, -10); // Offset da câmera em relação ao jogador
    public float followSpeed = 5f; // Velocidade de seguimento
    public float rotationSpeed = 2f; // Velocidade de rotação
    
    [Header("Zoom Settings")]
    public float minZoom = 5f;
    public float maxZoom = 15f;
    public float zoomSpeed = 2f;
    private float currentZoom = 10f;
    
    [Header("Rotation Settings")]
    public bool canRotate = true;
    public float minVerticalAngle = 10f;
    public float maxVerticalAngle = 80f;
    
    private Camera cam;
    private float currentRotationY = 0f;
    private float currentRotationX = 30f; // Ângulo inicial
    
    void Start()
    {
        cam = GetComponent<Camera>();
        currentZoom = offset.magnitude;
        
        // Se não tiver target definido, tentar encontrar o jogador
        if (target == null)
        {
            GameObject player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                SetTarget(player.transform);
            }
        }
    }
    
    void LateUpdate()
    {
        if (target == null) return;
        
        HandleInput();
        UpdateCameraPosition();
    }
    
    void HandleInput()
    {
        // Zoom com scroll do mouse
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (scroll != 0f)
        {
            currentZoom -= scroll * zoomSpeed;
            currentZoom = Mathf.Clamp(currentZoom, minZoom, maxZoom);
        }
        
        // Rotação da câmera com botão direito + mouse
        if (canRotate && Input.GetMouseButton(1))
        {
            float mouseX = Input.GetAxis("Mouse X");
            float mouseY = Input.GetAxis("Mouse Y");
            
            currentRotationY += mouseX * rotationSpeed;
            currentRotationX -= mouseY * rotationSpeed;
            currentRotationX = Mathf.Clamp(currentRotationX, minVerticalAngle, maxVerticalAngle);
        }
    }
    
    void UpdateCameraPosition()
    {
        // Calcular rotação
        Quaternion rotation = Quaternion.Euler(currentRotationX, currentRotationY, 0);
        
        // Calcular posição baseada na rotação e zoom
        Vector3 direction = rotation * Vector3.back;
        Vector3 targetPosition = target.position + direction * currentZoom;
        
        // Suavizar movimento
        transform.position = Vector3.Lerp(transform.position, targetPosition, followSpeed * Time.deltaTime);
        
        // Sempre olhar para o target
        transform.LookAt(target.position);
    }
    
    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
        
        if (target != null)
        {
            // Posicionar imediatamente atrás do jogador
            Vector3 targetPosition = target.position + offset;
            transform.position = targetPosition;
            transform.LookAt(target.position);
        }
    }
    
    public void SetZoom(float zoom)
    {
        currentZoom = Mathf.Clamp(zoom, minZoom, maxZoom);
    }
    
    public void ResetCamera()
    {
        currentRotationY = 0f;
        currentRotationX = 30f;
        currentZoom = 10f;
    }
    
    // Método para focar em uma posição específica (útil para cutscenes)
    public void FocusOnPosition(Vector3 position, float duration = 1f)
    {
        StartCoroutine(FocusCoroutine(position, duration));
    }
    
    private System.Collections.IEnumerator FocusCoroutine(Vector3 targetPos, float duration)
    {
        Vector3 startPos = transform.position;
        float elapsed = 0f;
        
        while (elapsed < duration)
        {
            elapsed += Time.deltaTime;
            float t = elapsed / duration;
            
            // Interpolar posição
            Vector3 currentPos = Vector3.Lerp(startPos, targetPos + offset, t);
            transform.position = currentPos;
            transform.LookAt(targetPos);
            
            yield return null;
        }
    }
}