using System;
using UnityEngine;
using SocketIOClient;

public class CharacterSocketHandler : MonoBehaviour
{
    void Start()
    {
        // Evento para receber a lista de personagens do servidor
        SocketIOManager.Instance.On("get_characters_response", (response) =>
        {
            var data = SocketIOManager.GetData<CharacterManager.CharactersResponse>(response);

            if (data != null && data.success)
            {
                // Atualiza a lista interna do CharacterManager
                CharacterManager.Instance.characters = data.characters;

                // Atualiza a UI da lista de personagens
                CharacterManager.Instance.PopulateCharacterList();
            }
            else
            {
                Debug.LogError("Falha ao obter personagens: " + data?.error);
            }
        });

        // Eventos de criação e seleção de personagem
        SocketIOManager.Instance.On("create_character_response", (response) =>
        {
            var data = SocketIOManager.GetData<CharacterManager.CreateCharacterResponse>(response);

            if (data != null && data.success)
            {
                Debug.Log("Personagem criado com sucesso!");
                CharacterManager.Instance.ShowCharacterSelection();
            }
            else
            {
                Debug.LogError("Erro ao criar personagem: " + data?.error);
            }
        });

        SocketIOManager.Instance.On("select_character_response", (response) =>
        {
            var data = SocketIOManager.GetData<CharacterManager.SelectCharacterResponse>(response);

            if (data != null && data.success)
            {
                Debug.Log("Personagem selecionado: " + data.character.name);
                SocketIOManager.Instance.characterId = data.character.id;
                CharacterManager.Instance.EnterGameWorld();
            }
            else
            {
                Debug.LogError("Erro ao selecionar personagem: " + data?.error);
            }
        });
    }

    // Método para pedir a lista de personagens ao servidor
    public void RequestCharacters()
    {
        SocketIOManager.Instance.Emit("get_characters");
    }
}
