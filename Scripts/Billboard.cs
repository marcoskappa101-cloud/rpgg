using UnityEngine;

public class Billboard : MonoBehaviour
{
    [Header("Billboard Settings")]
    public bool lockY = true; // Travar rotação no eixo Y
    public bool reverse = false; // Reverter direção
    
    private Camera targetCamera;
    
    void Start()
    {
        // Usar câmera principal por padrão
        targetCamera = Camera.main;
        
        // Se não encontrar, buscar pela tag
        if (targetCamera == null)
        {
            GameObject cameraObject = GameObject.FindGameObjectWithTag("MainCamera");
            if (cameraObject != null)
            {
                targetCamera = cameraObject.GetComponent<Camera>();
            }
        }
    }
    
    void LateUpdate()
    {
        if (targetCamera == null) return;
        
        Vector3 directionToCamera = targetCamera.transform.position - transform.position;
        
        if (lockY)
        {
            directionToCamera.y = 0; // Remover componente Y para manter horizontal
        }
        
        if (directionToCamera.sqrMagnitude > 0.01f)
        {
            Quaternion targetRotation = Quaternion.LookRotation(directionToCamera);
            
            if (reverse)
            {
                targetRotation *= Quaternion.Euler(0, 180, 0);
            }
            
            transform.rotation = targetRotation;
        }
    }
    
    public void SetTargetCamera(Camera camera)
    {
        targetCamera = camera;
    }
}