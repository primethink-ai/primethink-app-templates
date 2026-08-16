# Managing Document Visibility

For certain workflows, you might want to attach documents that are visible to the virtual assistant but not to the users in the chat. This is particularly useful for:

- Providing background information to the assistant
- Including reference materials that don't need to clutter the user interface
- Setting up knowledge bases that work behind the scenes

This functionality is available in task configurations, where you can set the "hidden" flag for documents while still specifying their accessibility status.

## Understanding RAG (Retrieval Augmented Generation)

RAG (Retrieval Augmented Generation) is a powerful approach that enhances AI language models by connecting them to external knowledge sources. In PrimeThink, RAG is implemented through the document system with the "Search" accessibility status.

### How RAG Works in PrimeThink

1. **Indexing Phase**
   - When you upload a document and set its accessibility status to "Search," PrimeThink processes and indexes the document
   - The system breaks down the document into meaningful chunks
   - Each chunk is converted into a vector representation (embedding) that captures its semantic meaning
   - These embeddings are stored in a vector database for efficient retrieval

2. **Retrieval Phase**
   - When a user asks a question or makes a request in the chat
   - The system converts the query into the same vector space as the document chunks
   - It performs a similarity search to find the most relevant document sections
   - The most relevant chunks are retrieved based on semantic similarity, not just keyword matching

3. **Generation Phase**
   - The retrieved document chunks are added to the context window for the AI assistant
   - The assistant uses both its training knowledge and the retrieved information to generate a response
   - This allows for more accurate, up-to-date, and contextually relevant answers

### Benefits of RAG in PrimeThink

- **Access to Specialized Knowledge**: RAG enables virtual assistants to leverage specific information from your documents that wouldn't be in their general training data.

- **Reduced Hallucinations**: By grounding responses in retrieved document content, RAG significantly reduces the likelihood of AI assistants generating incorrect information.

- **Customized Responses**: The system provides answers that are specific to your organization's knowledge, policies, or domain expertise.

- **Transparency**: Responses can reference specific sources from your documents, making information more traceable and verifiable.

- **Efficiency**: Only the most relevant parts of documents are used, rather than overwhelming the AI with entire document contents.

### Understanding CAG (Context Augmented Generation)

CAG (Context Augmented Generation) represents another approach to working with documents in PrimeThink, implemented through the "Context" access status. Unlike RAG, which retrieves only relevant portions of documents, CAG provides the entire document content to the AI assistant.

#### How CAG Works

1. When a document's access status is set to "Context," the entire document (if it fits within the context window) is directly provided to the AI assistant.

2. This approach effectively "augments" the model's context with the complete document, making all information readily available without a retrieval step.

3. The AI assistant can then reference, analyze, and utilize any part of the document without needing to explicitly request specific sections.

#### When to Use CAG

CAG is particularly effective for:
- Smaller documents that need to be analyzed in their entirety
- Situations where the whole document provides important context
- Cases where you want to ensure nothing is missed through the retrieval process
- Documents where the relationships between different sections are important

While CAG provides comprehensive access to document content, it's limited by the AI's context window size. For larger documents, RAG often provides a more efficient approach by retrieving only the most relevant sections.

### RAG vs. Other Document Access Methods

| Feature | Archived (Agentic) | Search (RAG) | Context (CAG) |
|---------|-------------------|-------------|--------------|
| AI access method | Explicit tool use | Automatic retrieval | Always available |
| Document size limitation | None | None | Limited by context window |
| Precision | High (targeted retrieval) | Medium-High (semantic search) | Low (entire document) |
| Use case | Specific document lookup | General knowledge queries | Full document analysis |
| Context window usage | Efficient | Efficient | Can be inefficient |

### Practical Applications

RAG is particularly effective for:

- **Knowledge Bases**: Making company policies, procedures, and FAQ documents accessible to virtual assistants
- **Legal Document Analysis**: Retrieving relevant precedents or clauses from large legal corpora
- **Research Support**: Pulling relevant information from academic papers or reports
- **Customer Support**: Finding accurate product information from technical documentation

## Best Practices

- Use **Archived** status when you want assistants to specifically reference documents only when needed
- Use **Search** status for large reference documents where only portions may be relevant to any given query
- Use **Context** status for smaller, highly relevant documents that should be fully considered
- Regularly review and update document collections to ensure assistants have access to the most current information
- Consider using a mix of status types to create the optimal knowledge environment for your specific use case
- For optimal RAG performance, ensure documents are well-structured with clear headings and concise sections
- Test different chunk sizes and overlap settings if you have access to advanced RAG configuration options
