import React, { useState } from 'react';
import { retrieveRelevantLore } from '../utils/ragUtils';

function parseSuggestedChanges(text) {
  const changes = [];
  const blocks = text.split('[SUGGESTED CHANGE]').slice(1);

  for (const block of blocks) {
    const characterMatch = block.match(/Character:\s*(.+)/i);
    const traitMatch = block.match(/New Trait:\s*(.+)/i);
    const reasonMatch = block.match(/Reason:\s*(.+)/is);

    if (characterMatch && traitMatch) {
      changes.push({
        characterName: characterMatch[1].trim(),
        proposedTrait: traitMatch[1].trim(),
        reason: reasonMatch ? reasonMatch[1].trim() : '',
      });
    }
  }

  return changes;
}

export default function DynamicGMAssistant() {
  const [worldContext, setWorldContext] = useState(
    'We are in Ancient Greece. The players are currently exploring the ancient woods near Ephesus.',
  );

  const initialLore = `
- The Myth of Orion: Orion was a joyful explorer who loved gazing at the stars with his loyal dog, Sirius. He and Artemis were great friends who spent their days running through the forest, discovering new plants, and mapping the constellations. Eventually, the gods placed Orion in the sky as a magnificent constellation so he could shine brightly and guide travelers forever.
- The Myth of Actaeon: Actaeon was a curious wanderer who accidentally startled Artemis while she was quietly reading by a stream. To teach him a gentle lesson about respecting privacy and the quiet of nature, Artemis used her magic to temporarily turn him into a beautiful stag. Actaeon spent the day learning to appreciate the forest from an animal's perspective before politely turning back into a human, now a better friend to the woods.
- The Odyssey: Odysseus was a clever sailor trying to navigate his ship back to his family. Poseidon, the grumpy god of the sea, was annoyed that Odysseus forgot to say "thank you" after a smooth sailing trip. To teach him some manners, Poseidon created splashy waves and blew Odysseus's boat off course, sending him on a long, silly adventure where he had to outsmart grumpy giants and solve riddles to finally get home.
- The Myth of Hyacinthus: Hyacinthus was a cheerful boy who loved playing outdoor games. One day, he was playing a friendly game of catch with a golden flying disc with the sun god. The wind playfully blew the disc into a meadow. Where it landed, magic sparked, and a beautiful, sweet-smelling new flower sprang up from the grass. They named it the "Hyacinth" to celebrate their fun day.
- The Myth of Hercules: Hercules was the strongest hero in the world, but he had to learn that being a true hero wasn't just about lifting heavy boulders—it was about helping people. He went on grand, helpful adventures, like using a river to help a king clean a giant, messy barn, and safely relocating a grumpy, magical boar so it wouldn't bother the local farmers.
  `.trim();

  const [loreDatabase, setLoreDatabase] = useState(initialLore);
  const [playerAction, setPlayerAction] = useState('');

  const [suggestions, setSuggestions] = useState('');
  const [retrievedLore, setRetrievedLore] = useState('');
  const [suggestedChanges, setSuggestedChanges] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_OPENAI_API_KEY || '');

  const [characters, setCharacters] = useState([
    {
      name: 'Poseidon',
      traits:
        'God of the sea. Powerful, stormy, and easily angered. He has cursed the players.',
    },
    {
      name: 'Clio',
      traits:
        'A physician and priestess of Artemis. She is honest, kind, somewhat timid, and wants to help the players.',
    },
    {
      name: 'Artemis',
      traits:
        'Goddess of the hunt, wilderness, and nurturing. She is Poseidon’s niece.',
    },
    {
      name: 'Hades',
      traits:
        'God of the underworld. Mysterious and dark. He may offer help, but his help may come with consequences.',
    },
    {
      name: 'Stormbristle Boar',
      traits:
        'A magical boar in the ancient woods near Ephesus. Lightning crackles across her hide.',
    },
  ]);

  const [newCharName, setNewCharName] = useState('');
  const [newCharTraits, setNewCharTraits] = useState('');

  const handleTraitChange = (index, newTraits) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index].traits = newTraits;
    setCharacters(updatedCharacters);
  };

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;
    setCharacters([...characters, { name: newCharName, traits: newCharTraits }]);
    setNewCharName('');
    setNewCharTraits('');
  };

  const handleRemoveCharacter = (indexToRemove) => {
    setCharacters(characters.filter((_, index) => index !== indexToRemove));
  };

  const handleApproveChange = (index) => {
    const change = suggestedChanges[index];
    const charIndex = characters.findIndex((c) => c.name === change.characterName);

    if (charIndex !== -1) {
      const updatedCharacters = [...characters];
      updatedCharacters[charIndex].traits = change.proposedTrait;
      setCharacters(updatedCharacters);
    }

    setSuggestedChanges(suggestedChanges.filter((_, i) => i !== index));
  };

  const handleRejectChange = (index) => {
    setSuggestedChanges(suggestedChanges.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (!playerAction || !worldContext) return;
    if (!apiKey) {
      setError('OpenAI API key is required for RAG and story generation.');
      return;
    }

    setIsLoading(true);
    setSuggestions('');
    setRetrievedLore('');
    setSuggestedChanges([]);
    setError('');

    try {
      const searchQuery = `${worldContext}. Player Action: ${playerAction}`;
      const relevantLore = await retrieveRelevantLore(
        searchQuery,
        loreDatabase,
        apiKey,
        2,
      );
      setRetrievedLore(relevantLore);

      const characterData = characters
        .map((c) => `${c.name}: ${c.traits}`)
        .join('\n');

      const aiPromptPayload = `
SYSTEM DIRECTIVE: You are an AI Game Master Assistant. 

STRICT GROUNDING RULE: You must ONLY use the lore snippets provided in PRIORITY 2 below. Do NOT use outside real-world mythology, general knowledge, or unprovided fantasy tropes. If a detail is missing, keep the outcome simple and stay within the known bounds.

====================================================================
PRIORITY 1: CHARACTER TRAITS
====================================================================
${characterData}

====================================================================
PRIORITY 2: RETRIEVED LORE (STRICTLY USE ONLY THIS LORE)
====================================================================
${relevantLore}

====================================================================
CURRENT GAME STATE
====================================================================
World Setting: ${worldContext}
Player Action: "${playerAction}"

====================================================================
OUTPUT REQUIREMENTS
====================================================================
1. STORY SUGGESTIONS: Provide 2 short response options for children under 8 (no scary elements or violence).
2. TRAIT UPDATES: Suggest a trait change ONLY if the player's action fundamentally alters a character's core behavior.
Format any trait changes STRICTLY like this:
[SUGGESTED CHANGE]
Character: <Exact Name>
New Trait: <Updated Text>
Reason: <Why this changed>
      `.trim();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'system', content: aiPromptPayload }],
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'API Error');

      const aiResponseText = data.choices[0].message.content;

      if (aiResponseText.includes('[SUGGESTED CHANGE]')) {
        const storyPart = aiResponseText.split('[SUGGESTED CHANGE]')[0].trim();
        setSuggestions(storyPart);
        setSuggestedChanges(parseSuggestedChanges(aiResponseText));
      } else {
        setSuggestions(aiResponseText);
      }
    } catch (err) {
      console.error('RAG / AI Error:', err);
      setError(err.message || 'Failed to generate suggestions.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10 font-sans">
      <h2 className="text-3xl font-bold mb-2 text-blue-800">
        Quest Craft GM Co-Pilot
      </h2>
      <p className="text-gray-600 mb-6 border-b pb-4">
        Define your world, track NPCs, and manage AI trait suggestions.
      </p>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          1. Current Scenario / World
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="2"
          value={worldContext}
          onChange={(e) => setWorldContext(e.target.value)}
        />
      </div>

      <div className="mb-8 bg-blue-50/30 p-1 rounded-lg border border-blue-100">
        <details className="group cursor-pointer">
          <summary className="list-none p-4 flex justify-between items-center bg-white rounded-md shadow-sm hover:shadow transition-shadow">
            <h3 className="text-xl font-bold text-blue-900 flex items-center m-0">
              <span className="mr-2">🎭</span> Priority 1: Superdominant Traits
            </h3>
            <span className="text-blue-500 font-bold group-open:rotate-180 transition-transform duration-300">
              ▼
            </span>
          </summary>

          <div className="p-4 pt-6 cursor-default">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {characters.map((char, index) => (
                <div
                  key={index}
                  className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm relative group/card hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-lg">
                      {char.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveCharacter(index);
                      }}
                      className="text-red-400 hover:text-red-600 font-bold text-sm transition-opacity opacity-0 group-hover/card:opacity-100"
                      title="Remove Character"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <textarea
                    className="w-full p-2 text-sm text-gray-600 bg-gray-50 border border-transparent hover:border-blue-200 focus:border-blue-400 focus:bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none transition-all"
                    rows="3"
                    value={char.traits}
                    onChange={(e) => handleTraitChange(index, e.target.value)}
                    placeholder="Character traits..."
                  />
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100 shadow-inner">
              <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                <span className="mr-2">➕</span> Draft New Character
              </h4>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Name (e.g., Hermes)"
                  className="flex-1 p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Empirical Traits (e.g., Fast, mischievous...)"
                  className="flex-[2] p-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                  value={newCharTraits}
                  onChange={(e) => setNewCharTraits(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCharacter();
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddCharacter();
                  }}
                  disabled={!newCharName.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md text-sm font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors whitespace-nowrap shadow-sm"
                >
                  Add to Roster
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          3. Priority 2: Mythology Stories (Child-Friendly)
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm leading-relaxed"
          rows="6"
          value={loreDatabase}
          onChange={(e) => setLoreDatabase(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          OpenAI API Key (for RAG lore retrieval)
        </label>
        <input
          type="password"
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="sk-... (or set VITE_OPENAI_API_KEY in .env)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Required for RAG lore retrieval and GPT story generation.
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-800 mb-2">
          4. Unexpected Player Action
        </label>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          placeholder="e.g., 'They try to bargain with the Boar using a magic item...'"
          value={playerAction}
          onChange={(e) => setPlayerAction(e.target.value)}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isLoading || !playerAction || !worldContext || !apiKey}
        className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed w-full font-bold transition-colors shadow-sm"
      >
        {isLoading ? 'Consulting the Oracle...' : 'Generate GM Suggestions'}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {retrievedLore && (
        <div className="mt-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-md">
          <h3 className="font-bold text-emerald-800 mb-2 text-sm">
            RAG-Retrieved Lore (top 2 matches)
          </h3>
          <div className="text-emerald-900 whitespace-pre-wrap text-sm leading-relaxed">
            {retrievedLore}
          </div>
        </div>
      )}

      {suggestedChanges.length > 0 && (
        <div className="mt-8 p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-r-md shadow-md">
          <h3 className="font-bold text-yellow-800 mb-4 text-lg flex items-center">
            <span className="mr-2">⚠️</span> AI Suggested Trait Changes (Needs
            GM Approval)
          </h3>
          {suggestedChanges.map((change, index) => (
            <div
              key={index}
              className="bg-white p-4 rounded border border-yellow-200 shadow-sm mb-4"
            >
              <p className="font-bold text-gray-800 mb-2">
                Character: {change.characterName}
              </p>

              <div className="mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Current Trait:
                </span>
                <p className="text-sm text-gray-500 line-through bg-gray-50 p-2 rounded">
                  {
                    characters.find((c) => c.name === change.characterName)
                      ?.traits
                  }
                </p>
              </div>

              <div className="mb-2">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider">
                  Proposed Trait:
                </span>
                <p className="text-sm text-green-800 bg-green-50 p-2 rounded font-medium">
                  {change.proposedTrait}
                </p>
              </div>

              <p className="text-sm italic text-gray-600 mb-4">
                <strong>Reason:</strong> {change.reason}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApproveChange(index)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
                >
                  Approve Update
                </button>
                <button
                  onClick={() => handleRejectChange(index)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm font-bold transition-colors"
                >
                  Reject & Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions && (
        <div className="mt-6 p-6 bg-gray-50 border-l-4 border-blue-600 rounded-r-md shadow-inner">
          <h3 className="font-bold text-blue-900 mb-4 text-lg flex items-center">
            <span className="mr-2">✨</span> Story Suggestions
          </h3>
          <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {suggestions}
          </div>
        </div>
      )}
    </div>
  );
}
