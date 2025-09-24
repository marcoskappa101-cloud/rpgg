using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;

public class CharacterButton : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI nameText;
    [SerializeField] private TextMeshProUGUI detailsText;
    [SerializeField] private Button button;
    
    private CharacterManager.CharacterData characterData;
    private Action<CharacterManager.CharacterData> onSelectCallback;
    private Action onCreateCallback;

    public void Setup(CharacterManager.CharacterData data, Action<CharacterManager.CharacterData> onSelect)
    {
        characterData = data;
        onSelectCallback = onSelect;
        
        nameText.text = data.name;
        detailsText.text = $"{GetClassDisplayName(data.classe)} Nv.{data.level} - {GetRaceDisplayName(data.race)}";
        
        button.onClick.RemoveAllListeners();
        button.onClick.AddListener(OnButtonClicked);
    }

    public void SetupAsCreateButton(Action onCreate)
    {
        onCreateCallback = onCreate;
        
        nameText.text = "Criar Novo Personagem";
        detailsText.text = "Clique para criar um novo personagem";
        
        button.onClick.RemoveAllListeners();
        button.onClick.AddListener(OnCreateButtonClicked);
    }

    void OnButtonClicked()
    {
        onSelectCallback?.Invoke(characterData);
    }

    void OnCreateButtonClicked()
    {
        onCreateCallback?.Invoke();
    }

    string GetClassDisplayName(string classValue)
    {
        return classValue switch
        {
            "warrior" => "Guerreiro",
            "mage" => "Mago",
            "archer" => "Arqueiro",
            "rogue" => "Ladino",
            "cleric" => "Clérigo",
            _ => classValue
        };
    }

    string GetRaceDisplayName(string raceValue)
    {
        return raceValue switch
        {
            "human" => "Humano",
            "elf" => "Elfo",
            "dark_elf" => "Elfo Negro",
            "orc" => "Orc",
            "dwarf" => "Anão",
            _ => raceValue
        };
    }
}
