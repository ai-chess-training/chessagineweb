# Chess Context Protocol (CCP)

Chess Context Protocol is designed to provide specifications on making LLMs and Agents chess-aware such that
they are able to better communicate any chess related queries to end user via using context. This protocol
is divided into two sub protocols mainly Client and Server, that define specific protocol conditions on both 
the client and server that make the LLM and agents chess domain knowledgeable. 

### Notes:
- this protocol provides a very high level overview on better chess context engineering, this protocol does not gurentee that LLMs and Agents will think like a grandmaster, rather it provides protocols to make the current LLMs/Agents improve their understanding of the game of chess and better chess commuication.

- this protocol DOES NOT aim to make LLM play chess or come up with best moves, rather its aimed to better communicate possible best moves with the integration of engines

### Chess Context Definition
when we say chess context, it refers the concepts/themes/ideas for given chess position that may seem obvious to humans, but hard for an Agent or LLM to comprehend, this include things like where pieces are located, whats happening on the board, is this a opening position etc.

## Chess Context Protocol Client (CCPC)

The client protocol aims to help GUIs better aligin communication to LLM with proper chess context, by following the protocols the GUI ensures the server protocol receives valid external data information which Agents/LLMs might 
not have access to as well makes sure the latency between LLM to end user is quick to ensure better user experiece. 

### 0. User To Server Communication

The Chess GUI should allow users to post queries to the server, the Chess GUI should be able to save the query
for later usage, the query should not be modified in any way.

### 1. External Resource Fetching

The Chess GUI should fetch all possible data for given chess fen that LLMs/Agents do not have access to, or might increase the time on the server side. 

### 2. Resource Scoring

The Chess GUI should than apply scoring to the data such that each data has mapped scored value

### 3. Resource Prompting

The Chess GUI should format the data alongside the scores in a XML prompt that clearly identify the resource, its objective score, for multiple resources the prompt must be clearly structured in proper opening and closing tags

### 4. Resources Aggregation Prompt

The Chess GUI should do steps 1,2,3 for ALL possible resources for paticular context and build a full final prompt which includes user query from Step 0 that is sent to CCPS (Chess Context Protocol Server)

### Examples:
- Engine to CCSP Example
```
> User query: "What are the top 5 moves here?"

> Client inits CCP 

1) Chess GUI communicates with Engine resource via UCI to get best move and top 4 variations
2) Chess GUI scores the data by formatting Engine eval of a varaition and sorts it by eval
3) Chess GUI builds a valid resource prompt and uses XML <engine_analysis> </engine_analysis> tag for better formatting
5) Chess GUI does same Step 1,2,3 for and other N themes and sents usery query and fen

> Client sends builded prompt to CCPS
```

In the example above the LLM/Agent does not have access to engine data, and even if LLM is agentic it saves time on server as CCP covers external resource for CCPS (server)

- Chess Databases to CCPS example

```
> User query: "What are some chess game for queen's gambit?"

> Client inits CCP 

1) Chess GUI queries chess database for top games
2) Chess GUI scores the chess games by top GM games and adds WDL % scores
3) Chess GUI builds a valid resource prompt and uses XML <chess_database> </chess_database> tag for better formatting
5) Chess GUI does same Step 1,2,3 for N themes

> Client sends builded prompt to CCPS which includes the user query and the fen
```
In the above example Client fetches chess databases which LLM doesn't have access to, and adds database context




