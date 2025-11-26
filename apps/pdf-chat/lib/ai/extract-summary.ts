import type { SentenceImportance } from 'wink-nlp';

/**
 * Extracts a summary from a given text using the wink-nlp library.
 * @param text
 * @param cutoff
 */
export async function extractSummary(text: string, cutoff = 0.2) {
  const { default: winkNLP } = await import('wink-nlp');
  const { default: model } = await import('wink-eng-lite-web-model');

  const nlp = winkNLP(model);
  const its = nlp.its;

  const doc = nlp.readDoc(text);
  const sentences = doc.out(its.sentenceWiseImportance) as SentenceImportance[];
  const filtered = sentences.filter((s) => s.importance > cutoff);

  return filtered
    .map((s) => {
      return doc.sentences().itemAt(s.index);
    })
    .map((item) => item.out())
    .join('\n');
}
