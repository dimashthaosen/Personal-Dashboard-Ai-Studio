export interface CourseTheory {
  name: string;
  contribution: string;
}

export interface CourseTerm {
  term: string;
  definition: string;
}

export interface ChapterData {
  name: string;
  content: string;
  pastedText?: string;
  keyTerms?: CourseTerm[];
  keyTheorists?: CourseTheory[];
}

export interface CourseData {
  id: string;
  label: string;
  syllabusSummary: string;
  defaultLessonsPerWeek: number;
  learningCycles: {
    label: string;
    weeks: [number, number];
  }[];
  chapters: {
    weeks: [number, number];
    data: ChapterData;
  }[];
}

export const GP_EXAMPLES = `
1. (Deconstructing an Argument) "This lesson introduces students to the anatomy of an argument by analyzing a short op-ed on climate change. Students work in pairs to highlight the main claim in yellow, the supporting reasons in green, and the conclusion in blue. Through a guided class discussion, they evaluate whether the reasons logically support the conclusion. The lesson closes with an exit slip where students must identify a hidden assumption in the author's reasoning."
2. (Evaluating Sources) "This lesson focuses on evaluating the credibility of sources using the CRAAP test (Currency, Relevance, Authority, Accuracy, Purpose). Students are given three different articles about a recent global event - one from a reputable news outlet, one from a personal blog, and one from a biased organization. In small groups, they score each source and debate their findings. The lesson concludes with students writing a short paragraph justifying which source they would use for a research project."
3. (Local vs Global Perspectives) "This lesson explores how the issue of water scarcity is viewed differently at local, national, and global levels. Students begin by mapping their personal water usage, then analyze a case study of a drought-stricken community, and finally review a UN report on global water security. Through a jigsaw reading activity, students synthesize these perspectives. The lesson ends with a reflection on how local actions impact global outcomes."
`;

export const SOCIOLOGY_EXAMPLES = `
1. (Sex Ratio) "This lesson investigates the declining sex ratio in India, with a focus on the child sex ratio. Students examine the prosperity paradox, where relatively wealthy states such as Punjab and Haryana display some of the most distorted sex ratios. Students analyse social causes including son preference, dowry practices, and the misuse of diagnostic technology. A structured debate evaluates legal responses such as the PCPNDT Act alongside cultural initiatives like Beti Bachao, Beti Padhao."
2. (Literacy) "This lesson explores literacy as a critical factor shaping demographic outcomes and social inequality. Students study disparities in literacy by gender, caste, tribe, and region, and examine how illiteracy reinforces intergenerational poverty. Students analyse the relationship between female literacy and fertility. Census data from 1951 to 2011 are used to trace changes in literacy gaps."
3. (Migration) "This lesson examines rural-urban population shifts driven by internal migration. Students analyse push factors such as declining common property resources and rural unemployment, alongside pull factors like urban anonymity and economic opportunity. Through case studies, students assess the growth of million-plus cities and the resulting pressure on infrastructure."
4. (Population Policy) "This lesson traces the evolution of India's population policy, from the National Family Planning Programme in 1952 to the coercive sterilisation campaigns during the Emergency of 1975-76. Students examine the shift from population control to family welfare. Ethical debates focus on state coercion and individual rights, comparing target-driven approaches with the National Health Policy 2017."
`;

export const CURRICULUM: Record<string, CourseData> = {
  gp8: {
    id: "gp8",
    label: "Global Perspectives, Grade 8 (Cambridge Component 1)",
    syllabusSummary: "Cambridge Lower Secondary Global Perspectives curriculum focusing on skills in research, analysis, evaluation, reflection, collaboration, and communication.",
    defaultLessonsPerWeek: 2,
    learningCycles: [
      { label: "LC1 Basics of Global Perspectives", weeks: [1, 10] },
      { label: "LC2 Arguments and Evidence", weeks: [11, 20] },
      { label: "LC3 Working with Evidence", weeks: [21, 30] },
      { label: "LC4 Solving an Issue", weeks: [31, 40] }
    ],
    chapters: [
      { weeks: [1, 2], data: { name: "What's the Issue?", content: "Introduction to global issues and why they matter. Differentiating facts vs opinions." } },
      { weeks: [3, 4], data: { name: "Perspectives", content: "Understanding how different people view the same issue based on experiences and contexts." } },
      { weeks: [5, 6], data: { name: "Levels of Perspectives: Local/National/Global", content: "Analyzing how issues scale from local communities to global international platforms." } },
      { weeks: [7, 8], data: { name: "Facts vs Opinions", content: "Categorizing statements into facts (verifiable) and opinions (judgments or beliefs)." } },
      { weeks: [9, 10], data: { name: "Beliefs, Bias and Vested Interest", content: "Exploring how vested interests and personal biases shape reporting and beliefs." } },
      { weeks: [11, 13], data: { name: "Structure of Arguments", content: "Identifying premises, supporting details, and conclusions within arguments." } },
      { weeks: [14, 15], data: { name: "Identifying Arguments", content: "Extracting argument structures from written pieces." } },
      { weeks: [16, 18], data: { name: "Fallacies", content: "Fallacies: Identifying common logical fallacies - Ad Hominem, Straw Man, Slippery Slope - that weaken reasoning." } },
      { weeks: [19, 20], data: { name: "Creating Good and Bad Arguments", content: "Constructing robust evidence-based arguments vs. spotting poor ones." } },
      { weeks: [21, 22], data: { name: "(Mis)Interpreting data & statistics", content: "Understanding how data can be interpreted incorrectly." } },
      { weeks: [23, 24], data: { name: "Working with Case Studies", content: "Applying concepts to detailed real-world scenarios." } },
      { weeks: [25, 26], data: { name: "Good vs Bad Sources / CRAAP", content: "Evaluating sources using Currency, Relevance, Authority, Accuracy, Purpose." } },
      { weeks: [27, 28], data: { name: "Mis/Disinformation", content: "Distinguishing between misinformation, disinformation and malinformation." } },
      { weeks: [29, 30], data: { name: "Using Evidence to support arguments", content: "Integrating high-quality evidence into written structure." } },
      { weeks: [31, 32], data: { name: "Identifying local issues", content: "Brainstorming and scoping a community problem." } },
      { weeks: [33, 38], data: { name: "Team Project: researching & resolving a local issue", content: "Collaborative project executing field research to fix a local problem." } },
      { weeks: [39, 40], data: { name: "Research and reflection writing", content: "Finalizing project reports and submitting individual reflection papers." } }
    ]
  },
  soc11: {
    id: "soc11",
    label: "Sociology, Class 11 (NCERT)",
    syllabusSummary: "NCERT Class 11 Sociology: Introducing Sociology and Understanding Society.",
    defaultLessonsPerWeek: 4,
    learningCycles: [
      { label: "LC1", weeks: [1, 8] },
      { label: "LC2", weeks: [9, 18] },
      { label: "LC3", weeks: [19, 30] },
      { label: "LC4", weeks: [31, 40] }
    ],
    chapters: [
      { weeks: [1, 4], data: { name: "Sociology and Society", content: "Introducing Sociology Ch.1: The scope of sociology and its relationship with other social sciences." } },
      { weeks: [5, 8], data: { name: "Terms, Concepts and their use in Sociology", content: "Introducing Sociology Ch.2: Social groups, status, role, stratification." } },
      { weeks: [9, 13], data: { name: "Understanding Social Institutions", content: "Introducing Sociology Ch.3: Family, marriage, kinship, work, politics, religion, education." } },
      { weeks: [14, 18], data: { name: "Social Structure and Stratification", content: "Understanding Society Ch.1-2: Social structure, stratification and social processes in society." } },
      { weeks: [19, 21], data: { name: "Culture and Socialisation", content: "Introducing Sociology Ch.4: Deep dive into culture, values and the socialization process." } },
      { weeks: [22, 26], data: { name: "Research Methods", content: "Introducing Sociology Ch.5: Participant observation, surveys, interviews." } },
      { weeks: [27, 30], data: { name: "Western Sociologists", content: "Western Sociologists - Understanding Society Ch.4: The 3 Revolutions; Marx; Durkheim; Weber." } },
      { weeks: [31, 40], data: { name: "Indian Sociologists, Demographic Structure of Indian Society, Project Work", content: "Understanding Society Ch.5: G.S. Ghurye, D.P. Mukerji, A.R. Desai, M.N. Srinivas. Final Project." } }
    ]
  },
  asLevel: {
    id: "asLevel",
    label: "Sociology, AS Level (Cambridge 9699)",
    syllabusSummary: "Cambridge International AS Level Sociology (9699). Core themes include Socialisation, identity and methods of research, the Family, and Religion/Education optional modules.",
    defaultLessonsPerWeek: 4,
    learningCycles: [
      { label: "LC1 Identity & Methods", weeks: [1, 10] },
      { label: "LC2 Family & Change", weeks: [11, 20] },
      { label: "LC3 Education", weeks: [21, 30] },
      { label: "LC4 Religion & Revision", weeks: [31, 40] }
    ],
    chapters: [
      { weeks: [1, 3], data: { name: "The Sociological Perspective", content: "Basics of the sociological approach.", pastedText: "What is sociology? The study of society and social life. Structural vs interpretivist approaches.", keyTerms: [{ term: "Social structure", definition: "The organized pattern of social relationships." }], keyTheorists: [] } },
      { weeks: [4, 6], data: { name: "Socialisation and the Creation of Social Identity", content: "How individuals learn culture.", pastedText: "Primary and secondary socialization, the construction of gender and class identities.", keyTerms: [{ term: "Socialisation", definition: "Process of learning norms and values." }], keyTheorists: [] } },
      { weeks: [7, 8], data: { name: "Methods of Research", content: "Quantitative and qualitative methods.", pastedText: "Types of data, sampling, interviews, questionnaires, observation.", keyTerms: [], keyTheorists: [] } },
      { weeks: [9, 10], data: { name: "Theory and Methods (Positivism vs Interpretivism)", content: "Methodological debates.", pastedText: "Debate between positivism and interpretivism. Value freedom, objectivity.", keyTerms: [], keyTheorists: [] } },
      { weeks: [11, 14], data: { name: "The Family and Social Change", content: "Historical perspectives on the family.", pastedText: "Industrialisation and the nuclear family. Diversity in family structures.", keyTerms: [], keyTheorists: [] } },
      { weeks: [15, 17], data: { name: "Family Roles, Marriage and Changing Relationships", content: "Internal dynamics of the family.", pastedText: "Conjugal roles, symmetrical family, changing patterns of marriage and divorce.", keyTerms: [], keyTheorists: [] } },
      { weeks: [18, 20], data: { name: "The Social Construction of Age", content: "Childhood and old age.", pastedText: "Childhood as a social construction. Dependency ratio.", keyTerms: [], keyTheorists: [] } },
      { weeks: [21, 25], data: { name: "Education and Society", content: "Role and function of education.", pastedText: "Functionalist, Marxist, and interactionist views on education.", keyTerms: [], keyTheorists: [] } },
      { weeks: [26, 30], data: { name: "Education and Inequality", content: "Differential educational achievement.", pastedText: "The impact of class, gender, and ethnicity on educational outcomes.", keyTerms: [], keyTheorists: [] } },
      { weeks: [31, 34], data: { name: "Religion and Social Change", content: "Religion's role in society.", pastedText: "Secularisation, fundamentalism, religion as a conservative force or initiator of change.", keyTerms: [], keyTheorists: [] } },
      { weeks: [35, 37], data: { name: "Religion and Social Inequality", content: "Religion relative to class, gender, and ethnicity.", pastedText: "How religious affiliations reflect social divisions.", keyTerms: [], keyTheorists: [] } },
      { weeks: [38, 40], data: { name: "Revision and Past Papers", content: "Exam preparation.", pastedText: "Reviewing all AS topics and completing timed past papers.", keyTerms: [], keyTheorists: [] } }
    ]
  }
};

export function getChapterForWeek(courseId: string, week: number) {
  const course = CURRICULUM[courseId];
  if (!course) return null;

  const cycle = course.learningCycles.find(c => week >= c.weeks[0] && week <= c.weeks[1]);
  const chapter = course.chapters.find(c => week >= c.weeks[0] && week <= c.weeks[1]);

  return {
    chapterName: chapter?.data.name || "Revision / Flex Week",
    chapterContent: chapter?.data.content || "",
    pastedText: chapter?.data.pastedText,
    keyTerms: chapter?.data.keyTerms,
    keyTheorists: chapter?.data.keyTheorists,
    learningCycleLabel: cycle?.label || "General Schedule"
  };
}
