export interface Question {
  id: number;
  q: string;
  options: string[];
  answer: number;
}

export interface ExamCategory {
  id: string;
  title: string;
  description: string;
  durationMin: number;
  accent: string;
  icon: string;
  marksPerQuestion: number;
  negativeMarkFraction: number;
  questions: Question[];
  /**
   * Optional named sections describing inclusive question-number ranges.
   * When set, questions are NOT shuffled (only the options are), so the
   * candidate sees the same Q1–Q? sequence as defined here.
   */
  sections?: { name: string; from: number; to: number }[];
}

const placeholder = (topic: string): Question[] =>
  Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    q: `[${topic}] Sample question ${i + 1} - replace with real question.`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    answer: 0,
  }));

const Q = (id: number, q: string, options: string[], answer: number): Question => ({ id, q, options, answer });

const aptitudeQuestions: Question[] = [
  // ────────────────────────────────────────────────────────────────
  // Section A — Numerical Ability (Q1–Q20)
  // ────────────────────────────────────────────────────────────────
  Q(1, "A contractor agreed to complete a road-laying project in 48 days using 36 workers. After working for 12 days, it was found that only one-fifth of the work had been completed because the soil conditions were harder than expected. How many additional workers must be employed so that the remaining work is completed in the next 24 days?",
    ["18", "24", "30", "36"], 3),
  Q(2, "A merchant marked an electronic item 50% above cost price and offered two successive discounts of 15% and 10%. If the final selling price was ₹11,475 and transportation charges of ₹375 were borne by the merchant, what was the original cost price of the item?",
    ["₹8,500", "₹8,750", "₹9,000", "₹9,250"], 2),
  Q(3, "Two trains start simultaneously from opposite ends of a 540 km track and travel towards each other. The first train moves 20% faster than the second and they meet after 4 hours and 30 minutes. What is the speed of the faster train?",
    ["64 km/hr", "72 km/hr", "80 km/hr", "96 km/hr"], 1),
  Q(4, "A tank can be filled by pipe A in 18 hours and by pipe B in 24 hours, while a leak can empty the full tank in 36 hours. If all three are opened together and pipe B is closed after 4 hours, how much additional time will be required to fill the remaining portion of the tank?",
    ["6 hr", "6 hr 30 min", "7 hr", "7 hr 30 min"], 2),
  Q(5, "A sum invested at compound interest amounts to ₹72,900 in 2 years and ₹88,209 in 3 years. Assuming annual compounding and no withdrawals, what was the original principal?",
    ["₹54,000", "₹60,000", "₹62,500", "₹67,500"], 0),
  Q(6, "The present ages of a father and daughter are in the ratio 7:2. Eight years ago the father's age was five times the daughter's age. After how many years from now will the father's age become exactly three times the daughter's age?",
    ["8", "10", "12", "14"], 0),
  Q(7, "A boat travels 48 km downstream in 3 hours and returns the same distance upstream in 6 hours. If the river current remains constant throughout the journey, what is the speed of the boat in still water?",
    ["10 km/hr", "12 km/hr", "14 km/hr", "16 km/hr"], 1),
  Q(8, "A bag contains 6 red, 5 blue, and 4 green balls. Three balls are drawn at random without replacement. What is the probability that all three balls are of different colors?",
    ["24/91", "30/91", "36/91", "40/91"], 0),
  Q(9, "The average marks of 30 students were calculated as 68. Later it was discovered that one student's marks were entered as 46 instead of 64 and another student's marks were entered as 83 instead of 38. What is the correct average?",
    ["66.5", "67.5", "68.1", "69.1"], 1),
  Q(10, "A trader sells two articles for ₹2,400 each. On one article he gains 25%, while on the other he loses 20%. Considering both transactions together, what is his overall percentage gain or loss?",
    ["1% gain", "2% gain", "2% loss", "4% loss"], 2),
  Q(11, "A number is increased by 20% and the result is then decreased by 25%. If the final value obtained is 1,440, what was the original number?",
    ["1,440", "1,500", "1,560", "1,600"], 3),
  Q(12, "A company's population of employees increased by 15% in the first year and decreased by 10% in the second year. If the final number of employees is 2,070, what was the original number of employees?",
    ["1,900", "2,000", "2,100", "2,200"], 1),
  Q(13, "A work can be completed by A and B together in 12 days, while B and C together can complete it in 15 days. A alone takes 20 days to complete the work. How many days will C alone take?",
    ["24", "30", "40", "60"], 1),
  Q(14, "A shopkeeper mixes rice costing ₹42 per kg with rice costing ₹58 per kg and sells the mixture at ₹55 per kg, thereby making a profit of 10% on the mixture. In what ratio were the two varieties mixed?",
    ["1:2", "2:3", "3:5", "4:5"], 0),
  Q(15, "The difference between compound interest and simple interest on a certain sum for 2 years at 10% per annum is ₹480. What is the principal amount?",
    ["₹40,000", "₹48,000", "₹60,000", "₹72,000"], 1),
  Q(16, "A train travelling at 72 km/hr crosses a platform in 45 seconds and a man walking at 6 km/hr in the same direction in 18 seconds. What is the length of the platform?",
    ["420 m", "450 m", "480 m", "540 m"], 3),
  Q(17, "A sum doubles itself in 8 years at simple interest. In how many years will the same sum become three times itself under the same rate of interest?",
    ["12", "14", "16", "18"], 2),
  Q(18, "A dishonest milkman adds water to milk and gains 25% while selling the mixture at the cost price of pure milk. What percentage of the mixture is water?",
    ["16 2/3%", "20%", "25%", "33 1/3%"], 1),
  Q(19, "How many five-digit numbers can be formed using the digits 1, 2, 3, 4, and 5 without repetition such that the number is divisible by 5 and greater than 30,000?",
    ["12", "18", "24", "36"], 0),
  Q(20, "A number leaves remainder 5 when divided by 8, 12, and 18. What is the smallest such number greater than 500?",
    ["509", "581", "653", "725"], 0),

  // ────────────────────────────────────────────────────────────────
  // Section B — Verbal Ability (Q21–Q45)
  // ────────────────────────────────────────────────────────────────
  Q(21, "Choose the grammatically correct sentence.",
    ["Neither the director nor the employees was aware of the revised schedule.",
     "Neither the director nor the employees were aware of the revised schedule.",
     "Neither the director nor the employees has aware of the revised schedule.",
     "Neither the director nor the employees have aware of the revised schedule."], 1),
  Q(22, "Identify the sentence with the correct use of articles.",
    ["She is a honest officer with an excellent record.",
     "She is an honest officer with a excellent record.",
     "She is an honest officer with an excellent record.",
     "She is a honest officer with a excellent record."], 2),
  Q(23, "Choose the word closest in meaning to \"meticulous\".",
    ["Careless", "Thorough", "Temporary", "Impulsive"], 1),
  Q(24, "Choose the word opposite in meaning to \"transient\".",
    ["Fleeting", "Permanent", "Fragile", "Partial"], 1),
  Q(25, "Fill in the blank: Despite repeated assurances from management regarding job security, employees remained ______ about the future because the company's profits had declined for three consecutive quarters.",
    ["jubilant", "apprehensive", "indifferent", "complacent"], 1),
  Q(26, "Fill in the blank: The professor's explanation was so ______ that even students with no prior exposure to the subject could follow the argument without difficulty.",
    ["obscure", "lucid", "ambiguous", "verbose"], 1),
  Q(27, "Identify the error in: \"Each of the candidates have submitted their project reports before the deadline.\"",
    ["Each", "have", "their", "No error"], 1),
  Q(28, "Choose the correctly punctuated sentence.",
    ["After reviewing the report, the manager approved the proposal.",
     "After reviewing the report the manager, approved the proposal.",
     "After reviewing, the report the manager approved the proposal.",
     "After reviewing the report the manager approved, the proposal."], 0),
  Q(29, "Rearrange the following statements into a coherent paragraph: 1. The prototype exceeded expectations during testing. 2. Investors immediately showed interest in funding the project. 3. The startup had struggled for months to attract attention. 4. Positive media coverage followed shortly afterward.",
    ["3-1-2-4", "1-3-2-4", "2-4-3-1", "4-2-1-3"], 0),
  Q(30, "Choose the best replacement for the underlined part: \"The committee COMPRISED OF experts from different fields met yesterday.\"",
    ["comprised with", "was comprised of", "comprised", "comprising of"], 2),
  Q(31, "Select the sentence that is free from grammatical errors.",
    ["Hardly had the meeting begun when the power failed.",
     "Hardly the meeting had begun when the power failed.",
     "Hardly had begun the meeting when the power failed.",
     "Hardly the meeting begun when the power had failed."], 0),
  Q(32, "Choose the most appropriate word: The CEO's decision was not merely unpopular; it was widely regarded as ______ because it ignored all the evidence presented by the advisory panel.",
    ["prudent", "arbitrary", "generous", "cautious"], 1),
  Q(33, "Identify the sentence with the correct subject-verb agreement.",
    ["The quality of the products have improved significantly.",
     "The quality of the products has improved significantly.",
     "The quality of the products are improved significantly.",
     "The quality of the products were improved significantly."], 1),
  Q(34, "Choose the correct passive form: \"They will announce the results tomorrow.\"",
    ["The results will be announce tomorrow.",
     "The results will announced tomorrow.",
     "The results will be announced tomorrow.",
     "The results are announced tomorrow."], 2),
  Q(35, "Choose the correct indirect speech: Ravi said, \"I have completed the assignment.\"",
    ["Ravi said that he has completed the assignment.",
     "Ravi said that he had completed the assignment.",
     "Ravi said that I had completed the assignment.",
     "Ravi said that he completed the assignment."], 1),
  Q(36, "Choose the best word to complete the sentence: The researcher remained ______ in her conclusions, avoiding claims that the available data could not adequately support.",
    ["reckless", "tentative", "hostile", "indifferent"], 1),
  Q(37, "Select the correctly formed sentence.",
    ["No sooner did he arrive than the train departed.",
     "No sooner had he arrived when the train departed.",
     "No sooner did he arrive when the train departed.",
     "No sooner had he arrived than the train departed."], 3),
  Q(38, "Choose the most suitable meaning of the idiom \"spill the beans\".",
    ["Waste resources", "Reveal a secret", "Start an argument", "Make a mistake"], 1),
  Q(39, "Choose the one-word substitution for \"a person who studies ancient societies through material remains\".",
    ["Anthropologist", "Archaeologist", "Geologist", "Historian"], 1),
  Q(40, "Fill in the blank: The policy was introduced with the intention of reducing costs; ______, it ended up increasing administrative overhead.",
    ["therefore", "moreover", "however", "similarly"], 2),
  Q(41, "Identify the error in: \"Neither of the proposals were acceptable to the board because both lacked financial justification.\"",
    ["Neither", "were", "both", "No error"], 1),
  Q(42, "Choose the sentence that conveys the intended meaning most clearly.",
    ["After discussing the issue with the client, the report was revised.",
     "After discussing the issue with the client, the team revised the report.",
     "After discussing, the client revised the issue in the report.",
     "After the issue was discussed, the client and report were revised."], 1),
  Q(43, "Choose the most appropriate transition: The initial experiments produced inconsistent results. ______, the researchers redesigned the methodology before proceeding to the next phase.",
    ["Consequently", "Nevertheless", "Likewise", "Meanwhile"], 0),
  Q(44, "Choose the correct form: If the company ______ the warning signs earlier, it could have avoided the financial crisis.",
    ["notices", "noticed", "had noticed", "has noticed"], 2),
  Q(45, "Choose the sentence with the correct parallel structure.",
    ["The role requires planning campaigns, analyzing data, and communication with clients.",
     "The role requires planning campaigns, data analysis, and communicating with clients.",
     "The role requires to plan campaigns, analyzing data, and client communication.",
     "The role requires campaign planning, analyze data, and communicating with clients."], 1),

  // ────────────────────────────────────────────────────────────────
  // Section C — Reasoning Ability (Q46–Q65)
  // ────────────────────────────────────────────────────────────────
  Q(46, "In a certain code language, \"MOUNTAIN\" is written as \"NTVOUJBN\". Following the same pattern, how will \"JOURNEY\" be written?",
    ["KPVSOFZ", "KQVSNFZ", "LPVSOFY", "KPVTNGZ"], 0),
  Q(47, "Six friends P, Q, R, S, T, and U are seated around a circular table facing the center. P sits second to the left of Q, R sits opposite U, and T is an immediate neighbor of both P and U. Who sits opposite Q?",
    ["P", "R", "S", "T"], 3),
  Q(48, "A man walks 15 m north, turns right and walks 25 m, turns right again and walks 10 m, and then turns left and walks 20 m. How far and in which direction is he from the starting point?",
    ["30 m East", "35 m East", "25 m North-East", "30 m South-East"], 0),
  Q(49, "Statements: All laptops are devices. Some devices are tablets. No tablet is a desktop. Conclusions: I. Some laptops are tablets. II. No laptop is a desktop.",
    ["Only I follows", "Only II follows", "Both follow", "Neither follows"], 3),
  Q(50, "Find the next term in the series: 4, 9, 19, 39, 79, ?",
    ["119", "139", "159", "169"], 2),
  Q(51, "Pointing to a woman, Raj said, \"She is the daughter of the only son of my grandfather.\" How is the woman related to Raj?",
    ["Sister", "Daughter", "Niece", "Cousin"], 0),
  Q(52, "Arrange the following in a logical sequence: 1. Treatment 2. Recovery 3. Patient 4. Doctor 5. Hospital",
    ["4-5-3-1-2", "3-4-5-1-2", "5-4-3-2-1", "4-3-5-1-2"], 1),
  Q(53, "If South-East becomes North, North-East becomes West, and West becomes South-East, then East becomes which direction?",
    ["South", "North-East", "North-West", "South-West"], 2),
  Q(54, "Statements: All engineers are graduates. Some graduates are managers. Conclusions: I. Some engineers are managers. II. Some managers are graduates.",
    ["Only I follows", "Only II follows", "Both follow", "Neither follows"], 1),
  Q(55, "Find the missing term: AZ, BY, CX, DW, ?",
    ["EV", "FU", "EW", "FV"], 0),
  Q(56, "A cube is painted on all six faces and then cut into 125 smaller cubes of equal size. How many small cubes will have exactly two faces painted?",
    ["12", "24", "36", "48"], 2),
  Q(57, "Five students are ranked from 1 to 5. A is ranked above B but below C. D is below B, and E is above A but below C. Who is ranked third?",
    ["A", "B", "D", "E"], 0),
  Q(58, "Find the odd one out: 64, 125, 216, 343, 512, 625.",
    ["125", "216", "512", "625"], 3),
  Q(59, "If \"TABLE\" is coded as \"UBCMF\", then \"CHAIR\" will be coded as:",
    ["DIBJS", "DIBKT", "DICJS", "EIBJS"], 0),
  Q(60, "A clock shows 4:20. What is the angle between the hour hand and the minute hand?",
    ["10°", "20°", "30°", "40°"], 0),
  Q(61, "In a row of children, Ravi is 12th from the left and 18th from the right. How many children are there in the row?",
    ["28", "29", "30", "31"], 1),
  Q(62, "Find the next term: 3, 8, 18, 38, 78, ?",
    ["118", "138", "158", "178"], 2),
  Q(63, "Statements: Some books are magazines. All magazines are journals. Conclusions: I. Some books are journals. II. All books are journals.",
    ["Only I follows", "Only II follows", "Both follow", "Neither follows"], 0),
  Q(64, "A family consists of six members P, Q, R, S, T, and U. P is the father of Q, Q is the sister of R, S is the mother of T, and T is the son of P. If U is the grandfather of R, who is the mother of R?",
    ["P", "Q", "S", "Cannot be determined"], 2),
  Q(65, "Find the missing number: 7, 14, 28, 56, ?, 224.",
    ["84", "96", "112", "128"], 2),

  // ────────────────────────────────────────────────────────────────
  // Section D — Advanced Quant & Reasoning (Q66–Q85)
  // ────────────────────────────────────────────────────────────────
  Q(66, "A company invests ₹8 lakh at 12% compound interest annually and simultaneously borrows ₹5 lakh at 15% simple interest. What is the net gain after 3 years?",
    ["₹1,15,280", "₹1,24,480", "₹1,36,960", "₹1,52,000"], 0),
  Q(67, "Two trains of lengths 180 m and 220 m cross each other in opposite directions in 12 seconds. If the difference in their speeds is 48 km/hr, what is the speed of the faster train?",
    ["60 km/hr", "72 km/hr", "84 km/hr", "96 km/hr"], 2),
  Q(68, "Find the remainder when 7^125 is divided by 13.",
    ["1", "5", "7", "11"], 3),
  Q(69, "The volume of a cube increases by 72.8%. By what percentage does its side increase?",
    ["18%", "20%", "22%", "24%"], 1),
  Q(70, "Five workers can complete a project in 24 days. After working for 8 days, two workers leave. How many additional days will be required to finish the remaining work?",
    ["18", "20", "22", "24"], 1),
  Q(71, "If x + 1/x = 5, find the value of x⁴ + 1/x⁴.",
    ["447", "527", "577", "625"], 1),
  Q(72, "A committee of 5 is selected from 6 men and 4 women such that at least 2 women must be included. How many different committees can be formed?",
    ["186", "216", "246", "276"], 0),
  Q(73, "A bag contains 8 white and 6 black balls. Two balls are drawn without replacement. What is the probability that both are white?",
    ["14/91", "24/91", "28/91", "32/91"], 2),
  Q(74, "Find the next term in the series: 2, 6, 15, 31, 56, ?",
    ["84", "90", "92", "96"], 2),
  Q(75, "A number when divided by 5 leaves remainder 2, when divided by 7 leaves remainder 3, and when divided by 9 leaves remainder 4. What is the smallest positive number satisfying all three conditions?",
    ["157", "172", "192", "227"], 0),
  Q(76, "The ratio of the radii of two circles is 3:5. If the difference in their areas is 256π square units, what is the radius of the larger circle?",
    ["12", "16", "20", "24"], 2),
  Q(77, "A train leaves station A at 6:00 AM at 60 km/hr. Another train leaves station B, 420 km away, at 7:00 AM towards A at 80 km/hr. At what time will they meet?",
    ["8:30 AM", "9:00 AM", "9:30 AM", "10:00 AM"], 2),
  Q(78, "If log₂ 16 + log₄ 64 − log₈ 512 = ?",
    ["3", "4", "5", "6"], 1),
  Q(79, "A and B together can complete a work in 10 days, B and C together in 12 days, and A and C together in 15 days. In how many days can all three together complete the work?",
    ["6", "7", "8", "9"], 2),
  Q(80, "A dealer allows a discount of 20% on the marked price and still makes a profit of 25% on cost price. If the marked price is ₹3,000, what is the cost price?",
    ["₹1,800", "₹1,920", "₹2,000", "₹2,400"], 1),
  Q(81, "The average salary of 50 employees is ₹52,000. When the salaries of the top five employees are excluded, the average becomes ₹47,000. What is the average salary of the excluded employees?",
    ["₹92,000", "₹97,000", "₹1,02,000", "₹1,07,000"], 1),
  Q(82, "How many four-digit numbers can be formed from the digits 1, 2, 3, 4, 5, 6 without repetition such that the number is even and greater than 3,000?",
    ["120", "144", "168", "180"], 0),
  Q(83, "A mixture contains milk and water in the ratio 7:3. If 20 liters of the mixture are replaced with pure water and the resulting ratio becomes 7:5, what was the original quantity of the mixture?",
    ["80 L", "100 L", "120 L", "140 L"], 2),
  Q(84, "A cylindrical tank has radius 3 m and height 8 m. Water is filled up to 75% of its height. How many cubic meters of water does the tank contain?",
    ["48π", "54π", "60π", "72π"], 1),
  Q(85, "A number is first increased by 25%, then decreased by 20%, and finally increased by 10%. If the final value is 1,650, what was the original number?",
    ["1,200", "1,250", "1,300", "1,350"], 3),
];

const aptitudeSections = [
  { name: "Section A — Numerical Ability",          from: 1,  to: 20 },
  { name: "Section B — Verbal Ability",             from: 21, to: 45 },
  { name: "Section C — Reasoning Ability",          from: 46, to: 65 },
  { name: "Section D — Advanced Quant & Reasoning", from: 66, to: 85 },
];

const dsaQuestions: Question[] = [
  Q(1, "Which data structure uses the LIFO (Last In, First Out) principle?",
    ["Queue", "Stack", "Linked List", "Tree"], 1),
  Q(2, "What is the time complexity of Binary Search?",
    ["O(n)", "O(n²)", "O(log n)", "O(1)"], 2),
  Q(3, "Which sorting algorithm has the best worst-case time complexity?",
    ["Bubble Sort", "Quick Sort", "Merge Sort", "Selection Sort"], 2),
  Q(4, "Which data structure is best suited for implementing an \"Undo\" feature in a text editor?",
    ["Queue", "Stack", "Array", "Hash Map"], 1),
  Q(5, "What is the time complexity of inserting an element at the beginning of a Linked List?",
    ["O(n)", "O(log n)", "O(n²)", "O(1)"], 3),
  Q(6, "Which traversal of a Binary Search Tree gives elements in sorted order?",
    ["Preorder", "Postorder", "Inorder", "Level Order"], 2),
  Q(7, "What is the maximum number of nodes in a binary tree of height h?",
    ["2h", "2h - 1", "2^(h+1) - 1", "h²"], 2),
  Q(8, "In a Min-Heap, which element is always at the root?",
    ["Largest element", "Smallest element", "Middle element", "Last inserted element"], 1),
  Q(9, "Which data structure is used for BFS (Breadth First Search) in a graph?",
    ["Stack", "Tree", "Queue", "Array"], 2),
  Q(10, "What does a Hash Table use to map keys to values?",
    ["Sorting", "Indexing", "Hash Function", "Pointers"], 2),
];

// 20 Pro-Level System Design & Architecture MCQs.
const systemQuestions: Question[] = [
  Q(1, "In an HTTP/2 architecture, multiple client requests are multiplexed over a single TCP connection to an Express API Gateway. If a single packet containing a partial payload for Request A is lost in transit, what happens to Request B, which is fully received and queued behind it?",
    ["Request B is processed immediately because HTTP/2 streams are independent at the application layer.", "Request B is blocked and cannot be processed until the missing packet for Request A is retransmitted and acknowledged, due to TCP's strict ordered delivery.", "The TCP connection automatically falls back to HTTP/1.1 to process Request B.", "The API Gateway drops both requests and forces the client to initiate a new TLS handshake."], 1),
  Q(2, "You are designing a high-throughput time-series database. You choose a Log-Structured Merge (LSM) Tree over a traditional B-Tree. Which of the following is a primary trade-off of using an LSM-Tree?",
    ["LSM-Trees suffer from extreme Write Amplification, burning out SSDs much faster than B-Trees.", "LSM-Trees provide faster read performance but slower write performance compared to B-Trees.", "LSM-Trees require continuous background \"compaction\" processes that can cause periodic latency spikes during read operations.", "LSM-Trees cannot support range queries or sequential scans."], 2),
  Q(3, "A high-frequency trading platform requires absolute minimum latency. The load balancer does not need to inspect HTTP headers, cookie data, or URL paths; it only needs to distribute traffic based on IP and Port. Which load balancing strategy should be implemented?",
    ["Layer 7 HTTP Reverse Proxy", "Layer 4 Transport Level Load Balancing", "Application-Level Anycast", "DNS Round Robin with low TTL"], 1),
  Q(4, "The CAP theorem states you must choose between Consistency and Availability during a Partition (P). The PACELC theorem extends this. According to PACELC, what trade-off must a distributed database (like Cassandra or DynamoDB) make during normal operation when there is Else (E) no network partition?",
    ["Latency (L) versus Consistency (C)", "Availability (A) versus Durability (D)", "Partition Tolerance (P) versus Latency (L)", "Consistency (C) versus Partition Tolerance (P)"], 0),
  Q(5, "You implement the Command Query Responsibility Segregation (CQRS) pattern in a microservices architecture. The \"Command\" database is a heavily normalized PostgreSQL instance, and the \"Query\" database is a denormalized ElasticSearch index. What is the most significant architectural challenge introduced by this pattern?",
    ["The system can no longer handle concurrent writes.", "You must handle Eventual Consistency between the Command and Query databases, meaning users might read stale data immediately after a write.", "ElasticSearch cannot be horizontally scaled if it is used exclusively for queries.", "The API Gateway must execute Two-Phase Commits (2PC) across both databases for every read request."], 1),
  Q(6, "Your Express application consumes events from an Apache Kafka topic with 10 partitions. You scale your Node.js consumer microservice to 12 instances within the same Consumer Group. What happens to the event processing?",
    ["All 12 instances will process messages concurrently, increasing throughput by 20%.", "10 instances will process messages (one partition each), and 2 instances will sit completely idle.", "The Kafka broker will dynamically split two partitions to ensure all 12 instances receive data.", "A Split-Brain scenario occurs, causing duplicate message processing across all instances."], 1),
  Q(7, "You are replacing internal JSON-over-HTTP REST APIs with gRPC between backend microservices. Which of the following is a fundamental difference that provides gRPC its massive performance boost?",
    ["gRPC uses UDP instead of TCP, eliminating handshake latency.", "gRPC relies on Protocol Buffers (Protobuf), which transmits data as highly compressed, strongly-typed binary rather than human-readable text.", "gRPC automatically implements the Circuit Breaker pattern at the network layer.", "gRPC maintains stateful connections, eliminating the need for a database."], 1),
  Q(8, "In a distributed SQL database, a Two-Phase Commit (2PC) is used to guarantee atomicity across multiple nodes. The Coordinator node sends a \"Prepare\" message to all Participant nodes, and they all reply \"Yes.\" Before the Coordinator can send the \"Commit\" message, the Coordinator node crashes and goes offline. What state are the Participant nodes in?",
    ["They automatically abort and rollback the transaction after a 5-second timeout.", "They are blocked and must hold their database locks indefinitely until the Coordinator recovers or an administrator intervenes.", "They elect a new Coordinator from among themselves and immediately commit.", "They silently drop the transaction and accept new writes."], 1),
  Q(9, "A highly complex, cached API response expires. Suddenly, 10,000 concurrent client requests hit the cache, find it empty (Cache Miss), and all 10,000 requests simultaneously query the backend database, crashing it. Which mitigation strategy actively prevents this without serving stale data indefinitely?",
    ["Increasing the cache TTL to 30 days.", "Probabilistic Early Expiration (Cache-Busting) or Mutex Locks (Request Coalescing).", "Implementing a Least Recently Used (LRU) eviction policy.", "Switching from Memcached to Redis."], 1),
  Q(10, "A sports application features a live scoreboard. The server pushes updates to the client every 500ms. The client never sends any data back to the server other than the initial connection request. Why might Server-Sent Events (SSE) be architecturally superior to WebSockets in this specific scenario?",
    ["SSE is bidirectional, whereas WebSockets are strictly unidirectional.", "SSE runs over standard HTTP/1.1 or HTTP/2, natively supporting multiplexing, standard firewalls, and built-in automatic reconnections without custom transport layers.", "WebSockets cannot transmit binary data, making them unsuitable for live scores.", "SSE utilizes UDP, making it immune to Head-of-Line blocking."], 1),
  Q(11, "You are migrating a massive legacy monolithic application to a modern microservices architecture. Instead of a \"Big Bang\" rewrite, you implement the Strangler Fig pattern. How does this pattern operate at the system level?",
    ["A proxy (API Gateway) is placed in front of the monolith. As new microservices are built, the proxy gradually routes specific URL paths away from the monolith to the new services until the monolith can be safely decommissioned.", "The legacy database is replicated to a cloud provider, and the monolith is forced to read from the replica.", "The monolith's codebase is automatically transpiled from older languages (like Java) into Node.js using an LLM.", "Traffic is artificially restricted (throttled) to the monolith to force users onto the new system."], 0),
  Q(12, "A system uses a relational database with a Repeatable Read isolation level. Transaction A queries SELECT * FROM Orders WHERE status = 'PENDING' and gets 5 results. Transaction B simultaneously inserts a new order with a 'PENDING' status and commits. Transaction A runs the exact same query again. Under standard Repeatable Read (without Next-Key locking), what anomaly occurs?",
    ["Dirty Read: Transaction A sees uncommitted data.", "Non-Repeatable Read: An existing row Transaction A was viewing changes its values.", "Phantom Read: Transaction A suddenly sees 6 results instead of 5, as a new row matches the range condition.", "Write Skew: Transaction A overwrites Transaction B's data."], 2),
  Q(13, "A MongoDB cluster consists of 2 nodes across 2 data centers (DC1 and DC2) to ensure geographic redundancy. The network link between the data centers goes down. Both nodes assume the other is dead and promote themselves to Primary, accepting writes. When the network is restored, data is hopelessly corrupted. How is this \"Split-Brain\" prevented in modern distributed systems?",
    ["By implementing a strict Last-Write-Wins (LWW) conflict resolution algorithm.", "By ensuring the cluster always has an odd number of voting nodes (e.g., 3) and requiring a strict majority (Quorum) to elect a Primary or accept writes.", "By configuring both nodes to automatically shut down if ping times exceed 500ms.", "By manually pausing the database during network outages."], 1),
  Q(14, "You are designing an architecture for a video streaming platform like Netflix. You need to store petabytes of immutable, massive video files that will be served directly to Edge CDNs. Which storage architecture is appropriate?",
    ["Block Storage (e.g., AWS EBS) because it allows byte-level modification of the video files.", "Object Storage (e.g., AWS S3) because it scales infinitely, stores data as immutable objects with rich metadata, and provides native HTTP access.", "Relational Database BLOBs because it ensures strict ACID compliance for video playback.", "File Storage (e.g., AWS EFS) because it allows thousands of servers to mount the same OS directory natively."], 1),
  Q(15, "An asynchronous worker process consumes messages from a RabbitMQ queue to send confirmation emails. Due to a bug in the email formatting code, a specific message repeatedly crashes the worker. The broker continuously requeues the message, crashing the worker in an infinite loop (a \"Poison Pill\"). How is this resolved at the system level?",
    ["Configure the worker to silently acknowledge (ACK) and delete all failed messages.", "Configure the broker's retry policy to route the message to a Dead Letter Queue (DLQ) after a threshold of failed attempts, allowing the worker to process the rest of the queue.", "Increase the worker's RAM allocation.", "Switch from RabbitMQ to a purely synchronous HTTP REST architecture."], 1),
  Q(16, "You use stateless JSON Web Tokens (JWT) for API authentication. A user's account is compromised, and you need to instantly invalidate their active 60-minute JWT. Because JWTs are stateless and validated via cryptography on the API server, how do you revoke it before expiration without creating a database bottleneck?",
    ["Change the server's master signing secret, which instantly invalidates all JWTs for all users globally.", "Maintain a high-speed, centralized \"Deny List\" of revoked Token IDs (jti) in an in-memory datastore like Redis, checked by the Gateway on every request.", "Send an HTTP DELETE request to the client's browser to wipe their local storage.", "You cannot revoke a stateless JWT; you must wait the full 60 minutes for it to expire."], 1),
  Q(17, "You have 4 Redis cache servers. You route keys based on hash(key) % 4. Server #4 crashes. The algorithm changes to hash(key) % 3. Suddenly, 75% of your cached keys route to the wrong servers, causing a massive cache miss. Which concept solves this by mapping nodes and keys to a virtual ring, ensuring only a small fraction of keys are remapped when a node dies?",
    ["Linear Probing", "Round-Robin Hashing", "Consistent Hashing", "Cryptographic Hashing (SHA-256)"], 2),
  Q(18, "An API Gateway utilizes a Circuit Breaker pattern to protect a failing downstream microservice. The microservice recovers and comes back online. The Circuit Breaker transitions from the \"Open\" (failing fast) state to a testing state where it allows a limited number of requests through to verify recovery. What is this state called?",
    ["Closed", "Half-Open", "Throttled", "Dead-Letter"], 1),
  Q(19, "An API rate limiter uses the Token Bucket algorithm. The bucket holds a maximum of 10 tokens and is refilled at a rate of 1 token per second. A user has not made a request in 5 minutes. The user suddenly sends 15 concurrent requests. What happens?",
    ["10 requests are processed immediately (the burst), and 5 requests are rejected (HTTP 429).", "All 15 requests are processed immediately because the user has built up 300 seconds of unused capacity.", "The requests are processed strictly at 1 request per second for 15 seconds.", "All 15 requests are rejected because they exceed the 1-per-second refill rate."], 0),
  Q(20, "In a high-contention ticketing system (like buying concert tickets), thousands of users are trying to buy the same seat simultaneously. If you use Optimistic Concurrency Control (OCC) using version numbers, what is the primary system drawback compared to Pessimistic Locking?",
    ["OCC places exclusive locks on the database rows, completely freezing the database for other readers.", "OCC requires all users to maintain an active WebSocket connection.", "Under massive contention, OCC results in a high volume of aborted/failed transactions (HTTP 409 Conflicts), forcing the application layer to handle heavy retry logic.", "OCC strictly violates ACID isolation guarantees."], 2),
];

// 15 Pro-Level Fundamental Coding & Integration MCQs.
const technicalQuestions: Question[] = [
  Q(1, "In a legacy Express v4.x application, you write the following route: app.get('/data', async (req, res, next) => { const data = await fetchFromDB(); res.json(data); }). If fetchFromDB() throws an error or rejects the promise, what happens to the Express server?",
    ["The error is automatically caught by Express and passed to the global (err, req, res, next) error-handling middleware.", "The client receives a generic 500 Internal Server Error response automatically.", "The request hangs indefinitely until it times out, and an UnhandledPromiseRejection warning is logged, potentially crashing the Node process.", "Express intercepts the rejected promise and returns a 404 Not Found."], 2),
  Q(2, "You are building an API endpoint to fetch a list of transactions (GET /transactions). The database has 50 million records. A user requests page 50,000 using ?limit=100&offset=4999900. The query takes 8 seconds to execute. What is the standard API design solution to resolve this performance degradation?",
    ["Switch to Cursor-based pagination (e.g., ?limit=100&after=cursor_id), which allows the database to use an index to jump directly to the starting record instead of scanning and skipping millions of rows.", "Cache the entire 50 million record dataset in Redis to speed up the offset calculation.", "Increase the limit to 10,000 so the client has to make fewer total pagination requests.", "Change the database query to use a SELECT COUNT(*) to pre-calculate all pages before fetching the offset."], 0),
  Q(3, "Your Node.js API receives webhooks from Stripe whenever a customer makes a payment. An attacker intercepts a valid webhook payload and resends it to your endpoint 500 times, attempting to credit an account multiple times (a Replay Attack). How do you fundamentally secure the webhook integration?",
    ["By validating the JSON payload structure against a TypeScript interface before processing.", "By verifying the cryptographic signature in the Stripe-Signature header, which contains a timestamp, and rejecting any payloads older than a few minutes.", "By configuring your firewall to only accept webhooks from IP addresses located in the United States.", "By checking if the HTTP method is strictly POST and rejecting PUT requests."], 1),
  Q(4, "Your Node.js server crashes with an Out-Of-Memory (OOM) error every few days. After analyzing a heap snapshot, you notice millions of instances of a massive array are trapped in memory. Which of the following JavaScript patterns is the most likely culprit?",
    ["Using JSON.parse() on a very large API response payload.", "An event listener attached to a long-lived object (like the global process or a server instance) referencing variables from its outer scope, preventing the garbage collector from freeing them.", "Utilizing recursive functions without a strict base case, causing a Call Stack Exceeded error.", "Forgetting to use the new keyword when instantiating an ES6 class."], 1),
  Q(5, "Two users are updating the same Wiki article via your PUT /articles/123 API endpoint. To prevent Lost Updates (where User B blindly overwrites User A's changes), you implement Optimistic Concurrency Control. Which HTTP headers should your API utilize to achieve this?",
    ["The server sends an ETag header. The client sends a Cache-Control: no-cache header on the next request.", "The server sends an ETag (a hash of the resource). The client includes this hash in the If-Match header during the PUT. The server rejects the request with a 412 Precondition Failed if the hashes differ.", "The server sends an Authorization header, and the client responds with X-Forwarded-For.", "The server implements a Strict-Transport-Security header to encrypt the payload."], 1),
  Q(6, "Your API integrates with an external, third-party logistics API that frequently rate-limits you with 429 Too Many Requests or drops connections with 503 Service Unavailable. What is the industry-standard coding pattern to integrate robustly with this flaky service?",
    ["Implement a while(true) loop that aggressively retries the request every 10 milliseconds until it succeeds.", "Wrap the API call in an asynchronous setTimeout of exactly 60 seconds before retrying once.", "Implement retries using \"Exponential Backoff with Jitter,\" progressively increasing the wait time between retries and adding randomness to prevent synchronized Thundering Herd attacks on the third-party service.", "Immediately return a 200 OK to your client and drop the logistics request entirely to ensure your API remains fast."], 2),
  Q(7, "A frontend React app running on http://localhost:3000 attempts to make a POST request with a custom X-Tenant-ID header to an API on http://api.example.com. The browser blocks the request, stating the CORS preflight failed. What exactly is failing at the network level?",
    ["The browser sends an OPTIONS request first, but the server's response is missing the Access-Control-Allow-Headers: X-Tenant-ID header, causing the browser to block the actual POST.", "The Express server is missing the body-parser middleware, so it cannot read the JSON payload in the preflight request.", "The React application failed to include credentials: 'include' in the Axios configuration.", "The server rejected the request because the frontend is not using HTTPS."], 0),
  Q(8, "Your API acts as a middleman. Clients request a 5GB video file from your Express server, and your server fetches it from an internal AWS S3 bucket. If you use const file = await s3.getObject(); res.send(file.body);, the Node server crashes. How must you rewrite this integration?",
    ["Increase the Node heap limit to 8GB using --max-old-space-size=8192.", "Download the 5GB file to the Node server's local hard drive first, then use fs.readFileSync to send it.", "Compress the file into a ZIP archive using the zlib module before sending it to the client.", "Pipe the S3 readable stream directly into the Express response writable stream using s3Stream.pipe(res), ensuring data chunks are forwarded without buffering the whole file in RAM."], 3),
  Q(9, "Your API has an endpoint that processes a large array of complex mathematical calculations synchronously. When a user hits this endpoint, all other connected clients experience massive latency, and health-check pings fail. Why does this happen?",
    ["Synchronous JavaScript blocks the single-threaded Node.js Event Loop, preventing the server from accepting or processing any other incoming HTTP connections or asynchronous callbacks until the math finishes.", "The Node.js garbage collector pauses the application to clean up the mathematical variables.", "The router is using HTTP/1.1 instead of HTTP/2, causing head-of-line blocking.", "The database connection pool is exhausted by the heavy calculations."], 0),
  Q(10, "You have an endpoint PATCH /users/:id that updates a user's profile. The code is written as: User.findByIdAndUpdate(req.params.id, req.body). An attacker realizes they can pass {\"isAdmin\": true} in the JSON payload and successfully gain admin privileges. What is this vulnerability, and how is it fixed?",
    ["SQL Injection; fix it by escaping the input payload.", "Mass Assignment (Over-posting); fix it by explicitly destructuring and permitting only safe fields (e.g., const { name, email } = req.body) before updating the database.", "Cross-Site Scripting (XSS); fix it by sanitizing the HTML tags in the payload.", "Broken Authentication; fix it by rotating the JWT secret key."], 1),
  Q(11, "Your GraphQL integration queries a list of 50 users. For each user, a resolver fires a database query to fetch their associated Company data. This results in 1 query for the users, and 50 separate queries for the companies (The N+1 Problem). What is the standard coding solution to fix this integration?",
    ["Use Facebook's DataLoader utility to batch and cache the 50 individual company requests into a single SELECT * FROM Companies WHERE id IN (...) query.", "Change the database from PostgreSQL to MongoDB, which automatically prevents N+1 queries.", "Force the client to make separate REST API calls instead of using GraphQL.", "Add a composite index to the Company table."], 0),
  Q(12, "Your clients establish WebSocket connections to your API for real-time chat. Exactly 60 seconds after a user goes idle (stops typing), their WebSocket connection drops automatically, even though no errors are thrown in the browser or Node.js. What is the most likely cause?",
    ["The Node.js ws library has a hardcoded maximum connection time of 1 minute.", "The client's browser Garbage Collector deleted the WebSocket variable.", "An intermediate reverse proxy (like Nginx or an AWS Load Balancer) closed the connection due to an idle timeout because no Ping/Pong heartbeat frames were sent to keep the TCP connection alive.", "The React component unmounted and re-mounted in the background."], 2),
  Q(13, "An API endpoint POST /refunds processes financial refunds. If a client experiences a network timeout, they might retry the POST request, potentially refunding the customer twice. How should the API be designed to handle this safely?",
    ["Change the HTTP method to GET, as GET requests are naturally idempotent.", "Require the client to send a unique Idempotency-Key in the HTTP header. The API checks if a transaction with this key was already successfully processed; if so, it returns the cached successful response without re-processing.", "Configure the API to immediately disable the user's account if a duplicate payload is detected.", "Rely on the database's Primary Key auto-increment to naturally reject duplicate requests."], 1),
  Q(14, "A Node.js worker pulls jobs from a queue and updates a PostgreSQL database using a connection pool. After processing exactly 10 jobs, the worker freezes and stops processing completely. No CPU spikes occur. What coding error causes this?",
    ["The worker forgot to run pool.release() or client.end() inside a finally block after executing the query, resulting in connection pool exhaustion.", "The PostgreSQL server ran out of hard drive space.", "The worker was compiled with an older version of the V8 JavaScript engine.", "The JSON payloads in the queue exceeded the 16MB limit."], 0),
  Q(15, "You design a bulk API endpoint: POST /users/batch that accepts an array of 1,000 user objects to insert into the database. 999 users are valid, but 1 has an invalid email format. What is the most appropriate RESTful response and behavior for this integration?",
    ["Rollback the entire transaction and return a 400 Bad Request so the client knows exactly what failed.", "Insert the 999 valid users, ignore the 1 invalid user silently, and return a 200 OK.", "Insert the 999 valid users and return a 207 Multi-Status response containing an array detailing the 201 Created successes and the specific 400 Bad Request error for the failed item.", "Halt the process, return a 500 Internal Server Error, and trigger a PagerDuty alert to the backend team."], 2),
];

export const EXAMS: ExamCategory[] = [
  {
    id: "aptitude",
    title: "Aptitude Test",
    description: "85 MCQs across Numerical, Verbal, Reasoning & Advanced sections.",
    durationMin: 120,
    accent: "from-sky-500 to-emerald-400",
    icon: "🧮",
    marksPerQuestion: 2,
    negativeMarkFraction: 0.25,
    questions: aptitudeQuestions,
    sections: aptitudeSections,
  },
  {
    id: "dsa",
    title: "DSA Test",
    description: "10 DSA MCQs + 2 coding problems + 2 advanced coding problems — single exam.",
    durationMin: 90,
    accent: "from-indigo-500 to-cyan-400",
    icon: "🧩",
    marksPerQuestion: 2,
    negativeMarkFraction: 0.25,
    questions: dsaQuestions,
  },
  {
    id: "coding",
    title: "Coding Round",
    description: "Code reasoning, dry-run & output prediction.",
    durationMin: 30,
    accent: "from-blue-600 to-teal-400",
    icon: "💻",
    marksPerQuestion: 2,
    negativeMarkFraction: 0.25,
    questions: placeholder("Coding"),
  },
  {
    id: "system",
    title: "System Understanding",
    description: "Pro-level system design, architecture, networking & DB internals.",
    durationMin: 25,
    accent: "from-violet-500 to-sky-400",
    icon: "🖥️",
    marksPerQuestion: 2,
    negativeMarkFraction: 0.25,
    questions: systemQuestions,
  },
  {
    id: "technical",
    title: "Technical Assessment",
    description: "Pro-level fundamental coding, debugging & integration MCQs.",
    durationMin: 25,
    accent: "from-emerald-500 to-lime-400",
    icon: "⚙️",
    marksPerQuestion: 2,
    negativeMarkFraction: 0.25,
    questions: technicalQuestions,
  },
];

export function getExam(id: string): ExamCategory | undefined {
  return EXAMS.find((e) => e.id === id);
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function prepareExam(exam: ExamCategory): Question[] {
  // For sectioned exams, keep the question order stable (Q1, Q2, …).
  // For unsectioned exams, shuffle questions as before. Options are always
  // shuffled so candidates can't memorise option positions.
  const ordered = exam.sections ? exam.questions.slice() : shuffle(exam.questions);
  return ordered.map((q) => {
    const idxs = q.options.map((_, i) => i);
    const shuffled = shuffle(idxs);
    const options = shuffled.map((i) => q.options[i]);
    const answer = shuffled.indexOf(q.answer);
    return { ...q, options, answer };
  });
}
