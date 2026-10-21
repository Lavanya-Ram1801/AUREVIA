/**
 * Development seed. ALL content created here is DEMONSTRATION DATA (courses are flagged isDemo=true,
 * reviews/learners/instructors are fictional). Never run against a production database.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type SkillLevel } from '@prisma/client';

const prisma = new PrismaClient();

type LessonDef = [title: string, body: string];
type SectionDef = [title: string, lessons: LessonDef[]];
interface CourseDef {
  title: string; short: string; category: string; level: SkillLevel; instructor: string; priceCents: number;
  outcomes: string[]; prerequisites: string[]; description: string; sections: SectionDef[]; draft?: boolean;
}

const CATEGORIES = [
  { name: 'Web Development', slug: 'web-development', icon: 'code', description: 'Build for the modern web.' },
  { name: 'Data Science', slug: 'data-science', icon: 'bar-chart', description: 'Turn data into decisions.' },
  { name: 'Design', slug: 'design', icon: 'palette', description: 'UI, UX and visual craft.' },
  { name: 'Business', slug: 'business', icon: 'briefcase', description: 'Strategy, product and growth.' },
  { name: 'Personal Growth', slug: 'personal-growth', icon: 'sparkles', description: 'Productivity and communication.' },
  { name: 'Cloud & DevOps', slug: 'cloud-devops', icon: 'cloud', description: 'Ship and run software reliably.' },
];

const COURSES: CourseDef[] = [
  {
    title: 'Modern JavaScript from the Ground Up', short: 'Master the language of the web: syntax, functions, async code and modules.', category: 'web-development', level: 'BEGINNER', instructor: 'Maya Iyer', priceCents: 0,
    outcomes: ['Write clean, modern JavaScript (ES2023)', 'Understand scope, closures and the event loop', 'Fetch and handle data with async/await'], prerequisites: ['Basic computer skills'],
    description: 'A practical introduction to JavaScript for people who have never programmed, or who learned it in fragments. You will build a mental model of how the language works rather than memorising snippets.',
    sections: [
      ['Foundations', [['Values, variables and types', 'JavaScript has primitive values (string, number, boolean, null, undefined, bigint, symbol) and objects.\n\n- Prefer `const`; use `let` when you must reassign.\n- `typeof` tells you the runtime type of a value.\n\nTry it: declare a few variables and log their types.'], ['Functions and scope', 'Functions are values. A function remembers the variables around where it was defined (a closure).\n\n```js\nconst counter = () => { let n = 0; return () => ++n; };\n```'], ['Arrays and objects', 'Use `map`, `filter` and `reduce` to transform collections without manual loops. Objects group related data by key.']]],
      ['Asynchronous JavaScript', [['The event loop', 'JavaScript runs one thing at a time. Timers and network calls hand work to the host, and callbacks return to the queue when the stack is empty.'], ['Promises and async/await', '`async` functions return promises. `await` pauses the function, not the whole program. Always handle rejections with `try/catch`.'], ['Modules', 'ES modules use `import` and `export`. Each file has its own scope, which keeps large programs organised.']]],
    ],
  },
  {
    title: 'React in Practice: Build Real Interfaces', short: 'Components, state, effects and data fetching, taught by building a working app.', category: 'web-development', level: 'INTERMEDIATE', instructor: 'Maya Iyer', priceCents: 0,
    outcomes: ['Compose UIs from reusable components', 'Manage state and side effects correctly', 'Fetch, cache and display server data'], prerequisites: ['Comfortable with JavaScript functions and arrays'],
    description: 'Learn React by shipping a small but complete application. We focus on the ideas that transfer: composition, state ownership, and predictable data flow.',
    sections: [
      ['Thinking in Components', [['Components and props', 'A component is a function that returns UI. Props flow down; keep components small and single-purpose.'], ['State with hooks', '`useState` stores values that change over time. Derive anything you can from existing state instead of storing it twice.'], ['Rendering lists and forms', 'Give list items stable keys. Control form inputs with state so the UI always reflects the data.']]],
      ['Data and Effects', [['useEffect without the pain', 'Effects synchronise your component with something outside React. Clean up subscriptions and avoid effects for pure calculations.'], ['Fetching and caching data', 'Use a query library to handle loading, error and cached states instead of hand-rolling them in each component.'], ['Routing and structure', 'Organise by feature, not file type. Lazy-load routes to keep the first load fast.']]],
    ],
  },
  {
    title: 'Python for Data Analysis', short: 'Clean, explore and summarise real datasets with Python, pandas and charts.', category: 'data-science', level: 'BEGINNER', instructor: 'Dr. Arun Menon', priceCents: 0,
    outcomes: ['Load and clean tabular data', 'Summarise and group with pandas', 'Communicate findings with charts'], prerequisites: ['None, curiosity about data helps'],
    description: 'A hands-on path from raw CSV files to clear insights. You will practise on small datasets and learn habits that prevent common analysis mistakes.',
    sections: [
      ['Getting Started', [['Python essentials for analysts', 'Lists, dictionaries and loops are enough to begin. Notebooks let you mix code, output and notes.'], ['Loading data with pandas', 'A DataFrame is a table. Use `read_csv`, then inspect with `head()`, `info()` and `describe()` before doing anything else.'], ['Cleaning messy data', 'Handle missing values deliberately: drop, fill or flag them, and write down which you chose and why.']]],
      ['Analysis', [['Grouping and aggregating', '`groupby` splits data, applies a calculation, and combines the results. It answers most "per category" questions.'], ['Visualising results', 'Pick the chart that matches the question: lines for trends, bars for comparisons, scatter for relationships.'], ['Telling the story', 'Lead with the finding, then show the evidence. Label axes, state the time range, and note limitations.']]],
    ],
  },
  {
    title: 'Machine Learning Foundations', short: 'Understand how models learn, how to evaluate them, and how not to fool yourself.', category: 'data-science', level: 'INTERMEDIATE', instructor: 'Dr. Arun Menon', priceCents: 4900,
    outcomes: ['Frame problems as supervised learning tasks', 'Split data and evaluate models honestly', 'Recognise and reduce overfitting'], prerequisites: ['Python basics', 'High-school algebra'],
    description: 'A concept-first introduction to machine learning with minimal maths. Focus on workflow and evaluation, which matter more than any single algorithm.',
    sections: [
      ['Core Ideas', [['What does it mean to learn?', 'A model finds a function from inputs to outputs that generalises to new data. Training error alone is misleading.'], ['Train, validation and test sets', 'Hold out data the model never sees while you tune it. Touch the test set once, at the end.'], ['Overfitting and regularisation', 'A model that memorises noise performs poorly on new data. Simpler models, more data and regularisation all help.']]],
      ['Working with Models', [['Linear and logistic regression', 'Start with simple baselines. They are fast, interpretable and often hard to beat.'], ['Trees and ensembles', 'Decision trees split data by questions; ensembles combine many trees for stability.'], ['Choosing metrics', 'Accuracy hides class imbalance. Consider precision, recall and what each type of error costs.']]],
    ],
  },
  {
    title: 'UI Design Fundamentals', short: 'Layout, typography, colour and hierarchy: the craft behind interfaces people enjoy.', category: 'design', level: 'BEGINNER', instructor: 'Sofia Laurent', priceCents: 0,
    outcomes: ['Create clear visual hierarchy', 'Choose accessible colour and type', 'Build consistent spacing systems'], prerequisites: ['None'],
    description: 'Design is a set of learnable decisions. This course turns taste into repeatable principles you can apply to any screen.',
    sections: [
      ['Visual Basics', [['Hierarchy and contrast', 'Guide the eye with size, weight and colour. If everything is emphasised, nothing is.'], ['Typography that reads well', 'Limit yourself to one or two typefaces; keep body text around 16px with generous line height.'], ['Colour and accessibility', 'Check contrast ratios (4.5:1 for body text). Never use colour alone to convey meaning.']]],
      ['Layout and Systems', [['Spacing and grids', 'Use a consistent spacing scale (4/8px) so layouts feel intentional.'], ['Components and consistency', 'Reuse patterns for buttons, inputs and cards. Consistency reduces the effort of learning your interface.'], ['Reviewing your own work', 'Squint test, grayscale test and a fresh pair of eyes will expose most problems quickly.']]],
    ],
  },
  {
    title: 'UX Research Essentials', short: 'Plan interviews, test prototypes and turn observations into product decisions.', category: 'design', level: 'INTERMEDIATE', instructor: 'Sofia Laurent', priceCents: 0,
    outcomes: ['Plan and run user interviews', 'Synthesise findings into themes', 'Run lightweight usability tests'], prerequisites: ['Basic familiarity with product design'],
    description: 'Learn to find out what users actually need before you build it, using methods that fit small teams and tight timelines.',
    sections: [
      ['Understanding Users', [['Research questions first', 'Start with what you need to learn, then choose the method. A good question is specific and answerable.'], ['Interviewing without leading', 'Ask about past behaviour, not hypothetical futures. Stay quiet and let people finish.'], ['Recruiting participants', 'Recruit people who match your real users, and be transparent about how their data will be used.']]],
      ['Making Sense of It', [['Synthesis and themes', 'Group observations on a wall or board; look for patterns across people, not single quotes.'], ['Usability testing', 'Give participants tasks, not instructions. Five sessions reveal most major issues in a prototype.'], ['Sharing insights', 'Present decisions that follow from evidence. Short, visual summaries are read; long reports are not.']]],
    ],
  },
  {
    title: 'Product Management Basics', short: 'Discover problems, prioritise work and align a team around outcomes.', category: 'business', level: 'BEGINNER', instructor: 'Rohan Desai', priceCents: 0,
    outcomes: ['Write a clear problem statement', 'Prioritise with simple frameworks', 'Measure outcomes, not output'], prerequisites: ['None'],
    description: 'An introduction to the product role: how great teams decide what to build, and how to know whether it worked.',
    sections: [
      ['Discovery', [['What a product manager does', 'The role sits between users, business and engineering. Your job is clarity, not control.'], ['Defining the problem', 'A good problem statement names the user, the need and the evidence. Solutions come later.'], ['Setting goals and metrics', 'Choose a small number of metrics tied to user value. Beware vanity numbers.']]],
      ['Delivery', [['Prioritising the backlog', 'Frameworks like impact vs effort make trade-offs visible and discussable.'], ['Writing useful specs', 'A short document: context, goals, non-goals, open questions. Link to designs rather than duplicating them.'], ['Learning after launch', 'Review results against the goal you set, share what you learned, and decide what to do next.']]],
    ],
  },
  {
    title: 'Docker and Cloud Deployment', short: 'Containerise an app, push it to a registry and deploy it with confidence.', category: 'cloud-devops', level: 'INTERMEDIATE', instructor: 'Rohan Desai', priceCents: 3900,
    outcomes: ['Write efficient Dockerfiles', 'Run multi-service apps with Compose', 'Deploy and monitor a containerised service'], prerequisites: ['Comfortable with the command line'],
    description: 'Learn the container workflow end to end, from a Dockerfile on your laptop to a service running in the cloud.',
    sections: [
      ['Containers', [['Images and containers', 'An image is a read-only template; a container is a running instance. Layers are cached, so order instructions from least to most frequently changing.'], ['Writing a Dockerfile', 'Use a small base image, copy dependency manifests first, run as a non-root user.'], ['Compose for local development', 'Describe your app, database and cache in one file and start everything with a single command.']]],
      ['Deployment', [['Registries and tagging', 'Tag images with a version or commit SHA, never rely on `latest` in production.'], ['Environment configuration', 'Keep secrets out of images. Inject them as environment variables or via your platform\'s secret store.'], ['Health checks and logs', 'Expose a health endpoint and write logs to stdout so the platform can monitor and restart your service.']]],
    ],
  },
  {
    title: 'Effective Communication at Work', short: 'Write clearly, run better meetings and give feedback people can use.', category: 'personal-growth', level: 'BEGINNER', instructor: 'Rohan Desai', priceCents: 0,
    outcomes: ['Write concise, structured messages', 'Run focused meetings', 'Give and receive feedback constructively'], prerequisites: ['None'],
    description: 'Practical habits for being understood and getting things done with colleagues, in writing and in person.',
    sections: [
      ['Writing and Meetings', [['Lead with the point', 'Put the conclusion or request first, then give context. Busy readers will thank you.'], ['Meetings that respect time', 'Share an agenda and desired outcome beforehand; end with owners and dates.'], ['Async-friendly habits', 'Write messages that can be understood without a follow-up conversation.']]],
      ['Feedback', [['Giving feedback', 'Describe specific behaviour and its impact, then discuss what to do next.'], ['Receiving feedback', 'Listen first, ask clarifying questions, and decide later what to act on.'], ['Difficult conversations', 'Name the shared goal, stay curious about the other view, and agree on concrete next steps.']]],
    ],
  },
  {
    title: 'Advanced TypeScript Patterns (Draft)', short: 'Generics, conditional types and API design (work in progress).', category: 'web-development', level: 'ADVANCED', instructor: 'Maya Iyer', priceCents: 0, draft: true,
    outcomes: ['Design type-safe APIs'], prerequisites: ['Solid TypeScript fundamentals'],
    description: 'A draft course shown only to its instructor and admins; it demonstrates the unpublished workflow in the instructor dashboard.',
    sections: [['Generics', [['Generic constraints', 'Constrain type parameters with `extends` to make functions both flexible and safe.']]]],
  },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword || seedPassword.length < 8) {
    console.error('Set SEED_PASSWORD (min 8 chars) in .env before seeding.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo data when NODE_ENV=production.');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  // Idempotent reset of demo data only (accounts on the demo domain + demo courses).
  await prisma.course.deleteMany({ where: { isDemo: true } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@demo.aurevia.test' } } });

  const cats = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: c });
    cats.set(c.slug, row.id);
  }

  const mk = (name: string, role: 'STUDENT' | 'INSTRUCTOR', bio?: string) =>
    prisma.user.create({ data: { name, email: `${slug(name)}@demo.aurevia.test`, passwordHash, role, bio } });

  const instructors = new Map<string, string>();
  for (const [name, bio] of [
    ['Maya Iyer', 'Demo instructor. Frontend engineer and educator.'],
    ['Dr. Arun Menon', 'Demo instructor. Data scientist who loves clear explanations.'],
    ['Sofia Laurent', 'Demo instructor. Product designer and researcher.'],
    ['Rohan Desai', 'Demo instructor. Engineer turned product leader.'],
  ] as const) instructors.set(name, (await mk(name, 'INSTRUCTOR', bio)).id);

  const students = [await mk('Alex Student', 'STUDENT'), await mk('Priya Learner', 'STUDENT'), await mk('Sam Explorer', 'STUDENT')];

  const courseIds: string[] = [];
  for (const def of COURSES) {
    const course = await prisma.course.create({
      data: {
        title: def.title, slug: slug(def.title), shortDescription: def.short, description: def.description, level: def.level,
        priceCents: def.priceCents, outcomes: def.outcomes, prerequisites: def.prerequisites, isDemo: true,
        status: def.draft ? 'DRAFT' : 'PUBLISHED', publishedAt: def.draft ? null : new Date(),
        categoryId: cats.get(def.category)!, instructorId: instructors.get(def.instructor)!,
        durationMinutes: def.sections.reduce((s, sec) => s + sec[1].length * 10, 0),
        sections: {
          create: def.sections.map(([title, lessons], si) => ({
            title, position: si,
            lessons: { create: lessons.map(([lt, body], li) => ({ title: lt, content: body, position: li, durationMinutes: 10 })) },
          })),
        },
      },
    });
    if (!def.draft) courseIds.push(course.id);
  }

  const free = await prisma.course.findMany({ where: { isDemo: true, status: 'PUBLISHED', priceCents: 0 }, include: { sections: { include: { lessons: true } } }, orderBy: { createdAt: 'asc' } });
  const lessonsOf = (c: (typeof free)[number]) => c.sections.sort((a, b) => a.position - b.position).flatMap((s) => s.lessons.sort((a, b) => a.position - b.position));

  // Sample enrollments + progress (spread over the past week so charts have data).
  const plan: Array<[number, number, number]> = [[0, 0, 6], [0, 1, 2], [1, 0, 3], [1, 2, 6], [2, 0, 1], [2, 4, 4]];
  for (const [si, ci, done] of plan) {
    const course = free[ci];
    const student = students[si];
    if (!course || !student) continue;
    const lessons = lessonsOf(course);
    const enrollment = await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id, lastLessonId: lessons[Math.max(0, done - 1)]?.id } });
    for (let i = 0; i < Math.min(done, lessons.length); i++) {
      await prisma.lessonProgress.create({ data: { enrollmentId: enrollment.id, lessonId: lessons[i]!.id, completed: true, completedAt: new Date(Date.now() - (i % 6) * 86400000) } });
    }
    if (done >= lessons.length) {
      await prisma.enrollment.update({ where: { id: enrollment.id }, data: { completedAt: new Date() } });
    }
    await prisma.notification.create({ data: { userId: student.id, type: 'ENROLLMENT', title: 'Enrollment confirmed (demo)', message: `You are enrolled in "${course.title}".`, link: `/learn/${course.id}` } });
  }

  const reviews: Array<[number, number, number, string]> = [
    [0, 0, 5, 'Demo review: clear, practical and well paced.'], [1, 0, 4, 'Demo review: great examples, would like more exercises.'], [1, 2, 5, 'Demo review: finally understood closures!'],
  ];
  for (const [si, ci, rating, comment] of reviews) {
    const course = free[ci]; const student = students[si];
    if (course && student) await prisma.review.create({ data: { userId: student.id, courseId: course.id, rating, comment } });
  }
  for (const s of students) {
    await prisma.notification.create({ data: { userId: s.id, type: 'SYSTEM', title: 'Welcome to AUREVIA (demo)', message: 'This account contains demonstration data.', link: '/courses' } });
  }

  console.log(`Seeded ${CATEGORIES.length} categories, ${COURSES.length} demo courses (${courseIds.length} published), 4 instructors, 3 students.`);
  console.log('Demo accounts use the password from SEED_PASSWORD:');
  console.log('  student:    alex-student@demo.aurevia.test');
  console.log('  instructor: maya-iyer@demo.aurevia.test');
  console.log('  admin:      create with `npm run admin:create` (see README)');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
