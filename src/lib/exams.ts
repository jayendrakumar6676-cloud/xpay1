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
}

const placeholder = (topic: string): Question[] =>
  Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    q: `[${topic}] Sample question ${i + 1} - replace with real question.`,
    options: ["Option A", "Option B", "Option C", "Option D", "None of the above"],
    answer: 0,
  }));

// 30 aptitude questions — every question has a 5th option "None of the above".
const aptitudeQuestions: Question[] = [
  { id: 1, q: "In an exhaustive macroeconomic analysis of post-industrial agrarian supply chains, researchers observed a profound operational paradox: while the systemic implementation of high-frequency automated harvesting sub-routines universally escalated the absolute raw material yield across all tested demographics, the aggregate profitability metrics of the adopting cooperatives paradoxically demonstrated a statistically significant negative correlation over a fiscal quadriennium. Further forensic market auditing revealed that the artificially accelerated yield vectors induced a hyper-localized market saturation, thereby completely destabilizing the equilibrium of the localized price-elasticity curve. Based strictly on the empirical data and causal relationships explicitly articulated in this synopsis, which of the following extrapolations represents the most logically rigorous deduction?",
    options: [
      "The deployment of automated harvesting sub-routines is inherently detrimental to the long-term ecological sustainability of agrarian sectors.",
      "The aggregate financial deficit incurred by the cooperatives is directly and exclusively attributable to the exorbitant mechanical maintenance costs of the automated systems.",
      "A quantifiable escalation in raw material output does not unconditionally guarantee a corresponding proportional increase in the aggregate profitability of the producing entity.",
      "Hyper-localized market saturation is an inevitable, unavoidable consequence of all technological modernization efforts within the agricultural industry.",
      "None of the above.",
    ], answer: 2 },
  { id: 2, q: "In a distributed cloud computing cluster, two distinct processing algorithms are tasked with compiling a massive dataset. Algorithm Alpha, operating in isolation, requires exactly 24 continuous hours to process one petabyte of data. Algorithm Beta, operating under identical isolated parameters, requires 36 hours for the same volume. If both algorithms are executed concurrently, parallelizing their computational workloads for a duration of exactly 8 hours, what specific fraction of the one-petabyte dataset will remain unprocessed at the termination of the 8-hour window?",
    options: ["5/9", "4/9", "7/18", "11/18", "None of the above."], answer: 1 },
  { id: 3, q: "A regulatory compliance officer is auditing a designated consumption zone governed by a strict statutory mandate: \"Any biological entity engaging in the ingestion of ethanol-based beverages must possess a verified chronological age strictly exceeding 18 solar years.\" The officer observes a sample set of four distinct entities: Entity Alpha is actively consuming an ethanol-based beverage; Entity Beta is consuming a non-alcoholic botanical extract; Entity Gamma's official identification verifies a chronological age of precisely 16 solar years; and Entity Delta possesses documentation proving an age of 22 solar years. To rigorously logically prove that no statutory violations are occurring within this specific sample set, the regulatory officer must execute a state-verification procedure on which precise combination of entities?",
    options: ["Only Entity Alpha and Entity Gamma", "Only Entity Alpha", "Entity Alpha, Beta, Gamma, and Delta", "Only Entity Alpha, Gamma, and Delta", "None of the above."], answer: 0 },
  { id: 4, q: "Consider a continuous scalar variable x operating within the domain of real numbers, such that it satisfies the non-linear algebraic constraint defined by the polynomial equation x² + x − 1 = 0. By applying fundamental algebraic manipulations and factoring techniques to isolate the relational proportionality of x to its reciprocal, deduce the exact numerical evaluation of the higher-order expression given by the sum of the variable raised to its fourth power and the inverse of that identical fourth power.",
    options: ["1", "5", "7", "9", "None of the above."], answer: 2 },
  { id: 5, q: "During a high-altitude expedition, a quintet of researchers — designated P, Q, R, S, and T — must arrange their sleeping bags in a strictly linear adjacent sequence within a primary atmospheric tent. P, Q, and T strictly mandate a non-adjacent placement relative to R. Furthermore, P and S expressly prohibit any proximity to Q's immediate left or right coordinates. Identify the exact left-to-right positional sequence of the subjects.",
    options: ["R, S, P, T, Q", "Q, S, P, T, R", "R, P, S, T, Q", "P, S, R, T, Q", "None of the above."], answer: 0 },
  { id: 6, q: "Within an industrial thermodynamic desalination facility, a primary containment vessel holds exactly 40 cubic meters of untreated brine, which possesses a documented volumetric salinity concentration of 15%. Due to a prolonged thermal exposure cycle, exactly 16 cubic meters of the volatile H₂O solvent is completely evaporated from the containment vessel, leaving the entire precipitate mass suspended in the remaining liquid. Determine the updated percentage of salinity concentration within the final concentrated solution.",
    options: ["20%", "22.5%", "25%", "31.5%", "None of the above."], answer: 2 },
  { id: 7, q: "An algorithmic quantitative trading protocol liquidated a digital asset, realizing an 18% financial deficit relative to its initial fiat acquisition cost. Retrospective forensic analysis indicated that had the asset been liquidated at a price point exactly 680 INR higher than the executed order, the transaction would have successfully yielded a 16% fiscal surplus instead of a deficit. Based on these proportional offsets, determine the absolute initial fiat acquisition cost of the digital asset.",
    options: ["2,000 INR", "2,500 INR", "3,400 INR", "4,000 INR", "None of the above."], answer: 0 },
  { id: 8, q: "In the optimization of a multivariate non-linear cost function, an engineer encounters a system defined by two interdependent variables, u and v. The system constraints dictate that the linear sum of the variables (u + v) is strictly equal to 7, while their cross-product (u × v) remains constant at 10. Utilizing higher-order polynomial expansion techniques, determine the absolute value of the expression u³ + v³.",
    options: ["125", "133", "217", "343", "None of the above."], answer: 1 },
  { id: 9, q: "An architect conceptualizes a perfect hexahedron monolith, applying a uniform layer of crimson polymeric coating across its entire exterior macroscopic surface area. Subsequently, using a high-precision laser array, the monolith is partitioned orthogonally into exactly 27 isometric sub-hexahedrons of identical volumetric dimensions. If an automated sorting mechanism is tasked with isolating only those sub-components that possess the crimson coating on exactly two orthogonal planes, what is the precise numerical count of the components that will be successfully isolated?",
    options: ["4", "8", "12", "24", "None of the above."], answer: 2 },
  { id: 10, q: "Despite the primary investigator's initial, highly publicized assertion that the novel theoretical framework would finally establish a completely transparent, universally applicable, and ________ paradigm for accurately predicting anomalous sub-atomic particle trajectories, the subsequent peer-reviewed publication was so densely layered with contradictory axioms, recursive logic loops, and convoluted mathematical topology that it ultimately served only to ________ the very quantum phenomena it was originally engineered to clarify.",
    options: ["unambiguous … obfuscate", "convoluted … elucidate", "irrefutable … synthesize", "esoteric … propagate", "None of the above."], answer: 0 },
  { id: 11, q: "A datacenter network engineer is tasked with physically installing a sequence of hardware components into a linear rack architecture. The inventory consists of 5 highly specific proprietary modules (designated M1, M2, M3, M4, and M5) alongside 7 generic server chassis. To maintain optical pathway integrity, the proprietary modules must be installed in a strict, unbroken, chronostratigraphic sequence such that M1 is immediately adjacent and prior to M2, M2 is immediately prior to M3, and so forth until M5. Assuming all standard chassis are distinguishable from one another, calculate the absolute number of unique linear architectural configurations possible.",
    options: ["5,040", "40,320", "3,628,800", "39,916,800", "None of the above."], answer: 1 },
  { id: 12, q: "During the observation of a quantum mechanical harmonic oscillator, a physicist isolates two discrete superimposed energy states, defined mathematically as scalar variables x and y. The sum of their respective eigenvalues is verified to be 32, while the absolute differential magnitude between the two states is exactly 18. By applying these constraints, deduce the exact numerical product of the two discrete energy states.",
    options: ["175", "225", "400", "576", "None of the above."], answer: 0 },
  { id: 13, q: "In assessing the Big-O temporal complexity of a recursive decryption algorithm, a computer scientist models the scaling state space with the exponential equation 5^(2y − 1) = 3125. To properly calibrate the server load constraints, the scientist must determine the subsequent algorithmic execution time, which is strictly defined by the secondary exponential function 4^(y + 2). What is the evaluated output of this secondary function?",
    options: ["256", "1024", "4096", "16384", "None of the above."], answer: 1 },
  { id: 14, q: "A demographer analyzing the urban sprawl of a metropolitan sector noted that its demographic count currently stands at exactly 1,102,500 individuals. According to the census bureau's historical data models, this sector has experienced a compounding annual growth trajectory, strictly adhering to a 5% expansion rate year-over-year. Assuming no exogenous variables disrupted this continuous compound growth function, what was the exact demographic baseline of this sector exactly twenty-four months prior to the current measurement?",
    options: ["1,000,000", "1,025,000", "1,050,000", "995,000", "None of the above."], answer: 0 },
  { id: 15, q: "At exactly 07:00 hours standard time, two locomotive transport vehicles initiate their respective trajectories from a singular coincident origin coordinate. The primary locomotive vector is established along a strict Northern longitudinal axis, maintaining a constant velocity profile of 80