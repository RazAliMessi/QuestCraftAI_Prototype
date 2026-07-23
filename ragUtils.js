export async function getEmbedding(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Embedding error');
  return data.data[0].embedding;
}

export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function splitLoreIntoChunks(loreDatabase) {
  const byParagraph = loreDatabase
    .split(/\n\s*\n/)
    .filter((c) => c.trim().length > 0);
  if (byParagraph.length > 1) return byParagraph;

  return loreDatabase.split(/\n(?=- )/).filter((c) => c.trim().length > 0);
}

export async function retrieveRelevantLore(
  userQuery,
  loreDatabase,
  apiKey,
  topK = 2,
) {
  if (!loreDatabase || !loreDatabase.trim()) return 'No specific lore retrieved.';

  const chunks = splitLoreIntoChunks(loreDatabase);
  if (chunks.length === 0) return 'No specific lore retrieved.';

  const queryEmbedding = await getEmbedding(userQuery, apiKey);

  const scoredChunks = await Promise.all(
    chunks.map(async (chunk) => {
      const chunkEmbedding = await getEmbedding(chunk, apiKey);
      const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
      return { chunk, similarity };
    }),
  );

  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  return scoredChunks
    .slice(0, topK)
    .map((item) => item.chunk)
    .join('\n---\n');
}
