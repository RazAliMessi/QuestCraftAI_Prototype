# QuestCraft AI

A React GM co-pilot for tabletop roleplaying games. Define your world, track NPC traits, load child-friendly mythology lore, and compile structured AI prompts for unexpected player actions.

## Setup

```bash
npm install
cp .env.example .env   # add your OpenAI API key for RAG lore retrieval
npm run dev
```

## Features

- Editable world scenario and character roster
- Child-friendly Greek mythology lore database
- RAG pipeline: embeds player action and retrieves top 2 relevant lore chunks via OpenAI
- AI prompt payload builder with priority rules
- GM approval queue for suggested trait changes
