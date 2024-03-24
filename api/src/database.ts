import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { Document } from "langchain/document";
import { Database } from "generated/db.js";
import { ArxivPaperNote } from "prompts.js";

export const ARXIV_PAPERS_TABLE = "arxiv_papers";
export const ARXIV_EMBEDDINGS_TABLE = "arxiv_embeddings";
export const ARXIV_QA_TABLE = "arxiv_question_answering";

export class SupabaseDatabase {
  vectorStore: SupabaseVectorStore;

  client: SupabaseClient<Database, "public", any>;

  constructor(
    client: SupabaseClient<Database, "public", any>,
    vectorStore: SupabaseVectorStore
  ) {
    this.client = client;
    this.vectorStore = vectorStore;
  }

  static async fromDocuments(
    documents: Array<Document>
  ): Promise<SupabaseDatabase> {
    const privateKey = process.env.SUPERBASE_PRIVATE_KEY;
    const supabaseUrl = process.env.SUPERBASE_URL;
    if (!privateKey || !supabaseUrl) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, privateKey);

    const vectorStore = await SupabaseVectorStore.fromDocuments(
      documents,
      new OpenAIEmbeddings(),
      {
        client: supabase,
        tableName: ARXIV_EMBEDDINGS_TABLE,
        queryName: "match_documents",
      }
    );

    return new this(supabase, vectorStore);
  }

  async addPaper({
    paperUrl,
    name,
    paper,
    notes,
  }: {
    paperUrl: string;
    name: string;
    paper: string;
    notes: ArxivPaperNote[];
  }) {
    const { data, error } = await this.client
      .from(ARXIV_PAPERS_TABLE)
      .insert([
        {
          paperUrl,
          name,
          paper,
          notes,
        },
      ])
      .select();
    if (error) {
      throw error;
    }

    return data;
  }
}
