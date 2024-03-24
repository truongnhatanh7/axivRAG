import { SupabaseDatabase } from "database.js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { Document } from "langchain/document";
import { ArxivPaperNote } from "notes/prompts.js";
import {
  ANSWER_QUESTION_TOOL_SCHEMA,
  answerOutputParser,
  QA_OVER_PAPER_PROMPT,
} from "./prompt.js";
import { formatDocumentsAsString } from "langchain/util/document";

async function qaModel(
  question: string,
  documents: Array<Document>,
  notes: Array<ArxivPaperNote>
) {
  const model = new ChatOpenAI({
    modelName: "gpt-4-1106-preview",
    temperature: 0.0, // creative aspect
  });
  const modelWithTools = model.bind({
    tools: [ANSWER_QUESTION_TOOL_SCHEMA],
    tool_choice: "auto",
  });
  const chain =
    QA_OVER_PAPER_PROMPT.pipe(modelWithTools).pipe(answerOutputParser);
  const documentsAsString = formatDocumentsAsString(documents);
  const notesAsString = notes.map((note) => note.note).join("\n");
  const response = await chain.invoke({
    paper: documentsAsString,
    notes: notesAsString,
    question,
  });

  return response;
}

export async function qaOnPaper(question: string, paperUrl: string) {
  const database = await SupabaseDatabase.fromExistingIndex();
  const documents = await database.vectorStore.similaritySearch(question, 8, {
    url: paperUrl,
  });
  const { notes } = await database.getPaper(paperUrl);
  const answerAndQuestions = await qaModel(
    question,
    documents,
    notes as unknown as Array<ArxivPaperNote>
  );
  await Promise.all(
    answerAndQuestions.map(async (qa) => {
      database.saveQa(
        question,
        qa.answer,
        formatDocumentsAsString(documents),
        qa.followupQuestions
      );
    })
  );
  return answerAndQuestions;
}
