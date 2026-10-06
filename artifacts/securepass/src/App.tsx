import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, ClipboardCheck, Eye, EyeOff,
  FileCheck2, Fingerprint, Gauge, GraduationCap, Info, KeyRound, LockKeyhole, Menu,
  RotateCcw, Shield, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { analyzePassword } from '@/lib/password-checker';
import {
  loadSecurityAggregates, saveChecklist, savePasswordEvaluation, saveQuizResult, supabaseEnabled,
} from '@/lib/securepass-data';

const queryClient = new QueryClient();

interface SessionProgress {
  passwordScore: number | null;
  quizScore: number | null;
  quizTotal: number;
  checklistAnswers: Record<string, boolean>;
}

interface SessionProgressContextValue {
  progress: SessionProgress;
  recordPasswordScore: (score: number | null) => void;
  recordQuizResult: (score: number | null, total: number) => void;
  recordChecklistAnswers: (answers: Record<string, boolean>) => void;
}

const SessionProgressContext = createContext<SessionProgressContextValue | null>(null);

function useSessionProgress(): SessionProgressContextValue {
  const context = useContext(SessionProgressContext);
  if (!context) throw new Error('Session progress is not available.');
  return context;
}

const navigation = [
  { href: '/', label: 'Home', icon: Shield },
  { href: '/checker', label: 'Password Checker', icon: KeyRound },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/quiz', label: 'Security Quiz', icon: CircleHelp },
  { href: '/checklist', label: 'Security Checklist', icon: ClipboardCheck },
  { href: '/dashboard', label: 'Dashboard', icon: Activity },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  '/': { title: 'A safer password habit starts here', description: 'Practice better password habits with a private, local-first security learning toolkit.' },
  '/checker': { title: 'Practice with a password', description: 'Check password characteristics privately in your browser. Never enter a real password.' },
  '/learn': { title: 'Small lessons. Stronger habits.', description: 'Practical lessons for creating, storing, and protecting passwords.' },
  '/quiz': { title: 'Put your security instincts to work', description: 'Ten practical questions about password safety and account protection.' },
  '/checklist': { title: 'A security check-in, at your pace', description: 'Review eight practical habits for better account security.' },
  '/dashboard': { title: 'Learning, at a glance', description: 'Explore your session progress and optional anonymous community insights.' },
  '/privacy': { title: 'Privacy comes first', description: 'Learn what SecurePass does and does not collect.' },
  '/security': { title: 'Security by design', description: 'Understand how local password practice works.' },
  '/about': { title: 'A little more security literacy', description: 'The thinking behind SecurePass, an educational project.' },
};

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = pageMeta[location] ?? pageMeta['/'];
  useEffect(() => {
    document.title = `${current.title} · SecurePass`;
    let description = document.querySelector('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    description.setAttribute('content', current.description);
  }, [current]);
  useEffect(() => setMenuOpen(false), [location]);
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="SecurePass home">
            <span className="brand-mark"><ShieldCheck size={20} strokeWidth={2.3} /></span>
            <span>secure<span className="brand-light">pass</span></span>
          </Link>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            {navigation.map(({ href, label }) => (
              <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} aria-current={location === href ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</Link>
            ))}
          </nav>
          <Link href="/checker" className="header-cta">Try the checker <ArrowRight size={15} /></Link>
          <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand"><span className="brand-mark small"><ShieldCheck size={16} /></span><span>SecurePass</span><span className="footer-note">A learning tool, not a password manager.</span></div>
          <nav className="footer-nav" aria-label="Footer navigation">
            <Link href="/privacy">Privacy</Link><Link href="/security">Security</Link><Link href="/about">About</Link>
          </nav>
          <p>Passwords are evaluated locally in your browser.</p>
        </div>
      </footer>
    </div>
  );
}

function PageIntro({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <div className="page-intro"><div className="eyebrow"><span className="eyebrow-dot" />{eyebrow}</div><h1>{title}</h1><p>{description}</p>{children}</div>;
}

function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link href={href} className={`button ${secondary ? 'button-secondary' : 'button-primary'}`}>{children}<ArrowRight size={16} /></Link>;
}

function HomePage() {
  return <div className="page-wrap home-page">
    <section className="hero-panel">
      <div className="hero-copy">
        <div className="hero-kicker"><span className="pulse-dot" /> Build stronger password habits. Protect your digital life. <span className="kicker-rule" /></div>
        <h1>Protect Your<br />Digital Life With<br /><span>Better Password Habits</span></h1>
        <p className="hero-lede">Learn how passwords can be attacked, evaluate your password practices privately, and build safer security habits — without storing your actual passwords.</p>
        <div className="hero-actions"><ActionLink href="/checker">Check My Password</ActionLink><ActionLink href="/learn" secondary>Learn Password Security</ActionLink></div>
        <div className="hero-assurance"><LockKeyhole size={15} /> Your password never leaves your browser.</div>
      </div>
      <div className="hero-visual" aria-label="Illustration of a secure password score" role="img">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="visual-chip chip-top"><span className="tiny-lock"><LockKeyhole size={14} /></span> LOCAL ANALYSIS</div>
        <div className="strength-widget">
          <div className="widget-top"><span className="widget-label">PRACTICE CHECK</span><span className="widget-status"><span />PRIVATE</span></div>
          <div className="widget-shield"><ShieldCheck size={40} /></div>
          <div className="score-number">80<span>/100</span></div>
          <div className="score-copy">Strong foundation</div>
          <div className="meter-bars"><i /><i /><i /><i className="bar-lit" /><i /></div>
          <div className="widget-foot"><span>Length</span><b>Strong</b><span>Variety</span><b>Strong</b></div>
        </div>
        <div className="visual-chip chip-bottom"><Check size={14} /> Credentials never leave your browser</div>
        <div className="decor-dash dash-one" /><div className="decor-dash dash-two" />
      </div>
      <div className="hero-bottom"><span>SECURITY IS A PRACTICE, NOT A TEST.</span><span>START WITH ONE SMALL STEP <ArrowDownRight size={15} /></span></div>
    </section>
    <section className="trust-strip" aria-label="SecurePass principles">
      <div><span className="trust-icon"><Fingerprint size={19} /></span><span><b>Private practice</b><small>Local-only password checks</small></span></div>
      <div><span className="trust-icon"><GraduationCap size={19} /></span><span><b>Useful learning</b><small>Clear advice, no jargon</small></span></div>
      <div><span className="trust-icon"><Shield size={19} /></span><span><b>Better by design</b><small>Habits for everyday accounts</small></span></div>
    </section>
    <section className="home-section">
      <div className="section-heading"><div><div className="eyebrow">A SMALLER, SAFER START</div><h2>Security that makes sense.</h2></div><p>No scare tactics. Just practical ways to make your next sign-in a little safer.</p></div>
      <div className="path-grid">
        <Link href="/checker" className="path-card path-feature"><div className="path-icon"><KeyRound size={21} /></div><span className="path-index">01 / PRIVATE</span><h3>Private Password Analysis</h3><p>Practice with a fictional password. Every check stays in your browser.</p><span className="path-link">Open the checker <ArrowRight size={15} /></span></Link>
        <Link href="/learn" className="path-card"><div className="path-icon"><BookOpen size={21} /></div><span className="path-index">02 / LEARN</span><h3>Security Education</h3><p>Understand length, uniqueness, password managers, and more.</p><span className="path-link">Read the lessons <ArrowRight size={15} /></span></Link>
        <Link href="/quiz" className="path-card"><div className="path-icon"><CircleHelp size={21} /></div><span className="path-index">03 / PRACTICE</span><h3>Security Quiz</h3><p>Test your knowledge and learn from clear explanations.</p><span className="path-link">Take the quiz <ArrowRight size={15} /></span></Link>
        <Link href="/checklist" className="path-card"><div className="path-icon"><ClipboardCheck size={21} /></div><span className="path-index">04 / BUILD</span><h3>Security Checklist</h3><p>Turn security advice into useful habits at your own pace.</p><span className="path-link">Start a check-in <ArrowRight size={15} /></span></Link>
        <Link href="/dashboard" className="path-card"><div className="path-icon"><Activity size={21} /></div><span className="path-index">05 / INSIGHTS</span><h3>Anonymous Insights</h3><p>View aggregate trends without exposing anyone’s passwords.</p><span className="path-link">View the dashboard <ArrowRight size={15} /></span></Link>
      </div>
    </section>
    <section className="how-section">
      <div className="section-heading"><div><div className="eyebrow">PRIVATE BY DESIGN</div><h2>How it works.</h2></div><p>Only share anonymous details when you choose to.</p></div>
      <div className="how-grid">
        <article><span>01</span><h3>Enter a password</h3><p>Use a fictional example created only for this exercise.</p></article>
        <article><span>02</span><h3>Your browser evaluates it</h3><p>Strength estimates and pattern checks run on your device.</p></article>
        <article><span>03</span><h3>Choose what to share</h3><p>Only non-sensitive characteristics are eligible for optional saving.</p></article>
        <article><span>04</span><h3>Explore anonymous insights</h3><p>Dashboard statistics are grouped and never show individual passwords.</p></article>
      </div>
    </section>
    <section className="home-callout">
      <div className="callout-mark"><LockKeyhole size={21} /></div><div><span className="eyebrow">A QUICK BUT IMPORTANT NOTE</span><h2>Never use a real password here.</h2><p>The checker is for fictional practice only. SecurePass does not need your credentials to teach you safer habits.</p></div><ActionLink href="/privacy" secondary>Our privacy approach</ActionLink>
    </section>
    <section className="quiet-cta"><div className="quiet-line" /><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Start with a made-up password.</h2><p>Two minutes of practice. Your real accounts stay untouched.</p></div><ActionLink href="/checker">Begin practicing</ActionLink></section>
  </div>;
}

const strengthColors: Record<string, string> = { 'Very Weak': 'danger', Weak: 'warning', Fair: 'fair', Strong: 'good', 'Very Strong': 'excellent' };

function CheckerPage() {
  type Analysis = ReturnType<typeof analyzePassword>;
  const { recordPasswordScore } = useSessionProgress();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'success' | 'error' | 'unavailable'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const handleChange = (value: string) => {
    const nextAnalysis = value ? analyzePassword(value) : null;
    setPassword(value);
    setAnalysis(nextAnalysis);
    recordPasswordScore(nextAnalysis?.score ?? null);
    setSaveState('idle');
    setSaveMessage('');
  };
  const clear = () => { setPassword(''); setAnalysis(null); recordPasswordScore(null); setVisible(false); setSaveState('idle'); setSaveMessage(''); };
  const persist = async () => {
    if (!analysis) return;
    if (!supabaseEnabled) { setSaveState('unavailable'); setSaveMessage('Anonymous saving is not configured yet. Your local check still works.'); return; }
    setSaveState('pending'); setSaveMessage('');
    try {
      await savePasswordEvaluation({ strength: analysis.strength, length_category: analysis.lengthCategory, has_uppercase: analysis.hasUppercase, has_lowercase: analysis.hasLowercase, has_number: analysis.hasNumber, has_special: analysis.hasSpecial, has_sequence: analysis.hasSequence });
      setSaveState('success'); setSaveMessage('Anonymous characteristics saved. No password was sent.');
    } catch { setSaveState('error'); setSaveMessage('Could not save right now. Your practice password remains only in this page.'); }
  };
  const attrs = analysis ? [
    ['Length', analysis.lengthCategory === '16+' ? 'Long' : analysis.lengthCategory === '12-15' ? 'Good' : 'Could be longer', analysis.lengthCategory === '12-15' || analysis.lengthCategory === '16+'],
    ['Uppercase letters', analysis.hasUppercase ? 'Included' : 'Not found', analysis.hasUppercase],
    ['Lowercase letters', analysis.hasLowercase ? 'Included' : 'Not found', analysis.hasLowercase],
    ['Numbers', analysis.hasNumber ? 'Included' : 'Not found', analysis.hasNumber],
    ['Special characters', analysis.hasSpecial ? 'Included' : 'Not found', analysis.hasSpecial],
    ['Predictable patterns', analysis.hasSequence ? 'Pattern found' : 'No sequence found', !analysis.hasSequence],
    ['Repeated characters', analysis.hasRepeatedCharacters ? 'Repetition found' : 'No repetition found', !analysis.hasRepeatedCharacters],
  ] as const : [];
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="PRIVATE PRACTICE" title="Try a password. Keep it fictional." description="Explore password characteristics with a made-up example. The analysis happens right here in your browser."><span className="privacy-pill"><LockKeyhole size={14} /> Nothing is sent or stored</span></PageIntro>
    <div className="checker-layout">
      <section className="surface checker-form" aria-labelledby="practice-heading">
        <div className="card-topline"><span className="mini-icon"><KeyRound size={17} /></span><span>LOCAL PASSWORD CHECK</span><span className="live-tag"><i /> PRIVATE</span></div>
        <h2 id="practice-heading">Your practice password</h2>
        <p className="helper-copy">Please do not enter a password you use for any account. Make one up just for this exercise.</p>
         <form onSubmit={(event) => event.preventDefault()}>
           <label className="field-label" htmlFor="practice-password">Fictional password</label>
           <div className="password-input-wrap"><input id="practice-password" data-testid="input-practice-password" type={visible ? 'text' : 'password'} autoComplete="off" value={password} onChange={(event) => handleChange(event.target.value)} placeholder="Make something up…" aria-describedby="local-note" /><button className="reveal-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide practice password' : 'Show practice password'} data-testid="button-toggle-visibility">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
         </form>
        <p className="field-footnote" id="local-note"><LockKeyhole size={13} /> Analyzed locally. Never saved, sent, or remembered.</p>
        <div className="checker-actions"><button type="button" className="button button-secondary" onClick={clear} disabled={!password} data-testid="button-clear-password"><RotateCcw size={15} /> Clear</button><span className="char-count">{password.length} characters</span></div>
        {analysis && <div className="result-panel" aria-live="polite">
          <div className="result-heading"><div><span className="eyebrow">PRACTICE RESULT</span><h3 className={`strength-text ${strengthColors[analysis.strength]}`}>{analysis.strength}</h3></div><div className={`score-ring ${strengthColors[analysis.strength]}`}><b>{analysis.score}</b><span>/ 100</span></div></div>
          <div className="strength-meter" role="meter" aria-label="Educational password estimate" aria-valuemin={0} aria-valuemax={100} aria-valuenow={analysis.score}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < Math.ceil(analysis.score / 20) ? strengthColors[analysis.strength] : ''} />)}</div>
          <div className="checks-list">{attrs.map(([label, status, okay]) => <div className="check-row" key={label}><span className={`check-mark ${okay ? 'is-good' : 'is-notice'}`}>{okay ? <Check size={13} /> : <Info size={13} />}</span><span>{label}</span><b className={okay ? 'text-good' : 'text-warning'}>{status}</b></div>)}</div>
          {analysis.suggestions.length > 0 && <div className="suggestion-box"><b>Try this next</b><ul>{analysis.suggestions.map((suggestion, index) => <li key={`${index}-${suggestion}`}>{suggestion}</li>)}</ul></div>}
          <div className="save-row"><button className="button button-primary" type="button" disabled={saveState === 'pending'} onClick={persist} data-testid="button-save-evaluation">{saveState === 'pending' ? 'Saving…' : 'Optionally save anonymous traits'}<ArrowRight size={15} /></button></div>
          {saveMessage && <p className={`save-message ${saveState}`} role="status">{saveMessage}</p>}
        </div>}
      </section>
      <aside className="checker-aside">
        <div className="surface aside-card">
          <span className="aside-number">01</span><h3>What makes it stronger?</h3><p>Long, unique passphrases are easier to remember and harder to guess. A mix of character types can help, but length and uniqueness matter most.</p><Link href="/learn" className="inline-link">Learn the essentials <ArrowRight size={14} /></Link>
        </div>
        <div className="safety-note"><ShieldCheck size={20} /><div><b>Made for learning, not storing</b><p>Close or clear the page and the practice input is gone. Never use a real credential here.</p></div></div>
      </aside>
    </div>
  </div>;
}

const lessons = [
  { id: 'length', number: '01', title: 'Give it room to be strong', tag: 'LENGTH', body: 'Longer passwords create more possible combinations. A memorable passphrase made of several unrelated words can be both easier to remember and much harder to guess than a short, complicated-looking string.', takeaway: 'Aim for 16 or more characters when a service allows it.', icon: ArrowUpRight },
  { id: 'unique', number: '02', title: 'One account, one password', tag: 'UNIQUENESS', body: 'Reusing a password connects otherwise separate accounts. If one service is breached, someone may try that same credential elsewhere. Every account deserves a unique password.', takeaway: 'A password manager can create and remember unique passwords for you.', icon: Fingerprint },
  { id: 'manager', number: '03', title: 'Let a manager do the remembering', tag: 'PASSWORD MANAGERS', body: 'A reputable password manager stores credentials in an encrypted vault and can generate strong unique passwords. Protect the vault with a long master passphrase and multifactor authentication.', takeaway: 'Choose a trusted manager and secure its account carefully.', icon: KeyRound },
  { id: 'mfa', number: '04', title: 'Add another layer', tag: 'MULTIFACTOR AUTHENTICATION', body: 'Multifactor authentication (MFA) asks for another proof of identity beyond your password. An authenticator app or security key can help protect your account even if a password is exposed.', takeaway: 'Turn on MFA first for your email, financial, and other important accounts.', icon: ShieldCheck },
  { id: 'phishing', number: '05', title: 'Pause before you sign in', tag: 'PHISHING', body: 'Unexpected messages may pressure you to click a link or share a login code. Go directly to the service using a bookmark or known address instead of trusting a message link.', takeaway: 'A legitimate support team will not ask you to share a one-time login code.', icon: Info },
  { id: 'patterns', number: '06', title: 'Skip the predictable moves', tag: 'GUESSABILITY', body: 'Names, birthdays, keyboard walks, and simple substitutions are easy to anticipate. Attackers use common patterns and leaked-password lists, not just random guessing.', takeaway: 'Choose unrelated words or use a manager-generated password.', icon: Activity },
  { id: 'recovery', number: '07', title: 'Keep recovery in mind', tag: 'ACCOUNT RECOVERY', body: 'Recovery options help you regain access, but outdated email addresses or phone numbers can leave an account exposed or inaccessible.', takeaway: 'Review recovery information after a major change and secure your email account.', icon: RotateCcw },
  { id: 'updates', number: '08', title: 'Review your security settings', tag: 'MAINTENANCE', body: 'Security is not a one-time task. Review important accounts for unfamiliar sessions, old connected apps, recovery changes, and available sign-in protections.', takeaway: 'Start with your most important accounts, one at a time.', icon: FileCheck2 },
  { id: 'passphrases', number: '09', title: 'Make a passphrase memorable, not predictable', tag: 'PASSPHRASES', body: 'A longer phrase built from several unrelated words can be easier to remember than a short string of symbols. The words should not form a familiar saying or contain personal details.', takeaway: 'Use a fictional example for practice; never copy a lesson example into a real account.', icon: Sparkles },
  { id: 'mistakes', number: '10', title: 'Avoid the usual password mistakes', tag: 'COMMON MISTAKES', body: 'Short passwords, reuse, names and birthdays, sharing credentials, and predictable substitutions are all common risks. A symbol added to a familiar word does not automatically make it hard to guess.', takeaway: 'Use unique passwords, keep them private, and let a manager help where appropriate.', icon: CircleHelp },
];

function LearnPage() {
  const [open, setOpen] = useState<string | null>('length');
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="THE FIELD GUIDE" title="Small lessons. Stronger habits." description="A practical guide to the decisions that make everyday accounts safer." />
    <div className="learning-banner"><div className="banner-mark"><BookOpen size={22} /></div><div><b>Ten useful ideas, no security jargon.</b><p>Start anywhere. Take what works for you.</p></div><span className="lesson-count">10 <small>LESSONS</small></span></div>
    <div className="lesson-list">{lessons.map((lesson) => {
      const Icon = lesson.icon; const expanded = open === lesson.id;
      return <article className={`lesson-card ${expanded ? 'expanded' : ''}`} key={lesson.id}>
        <button className="lesson-toggle" type="button" onClick={() => setOpen(expanded ? null : lesson.id)} aria-expanded={expanded} aria-controls={`lesson-${lesson.id}`} data-testid={`button-lesson-${lesson.id}`}>
          <span className="lesson-number">{lesson.number}</span><span className="lesson-title-wrap"><span className="lesson-tag">{lesson.tag}</span><b>{lesson.title}</b></span><span className="lesson-icon"><Icon size={19} /></span><ChevronDown className="lesson-chevron" size={18} />
        </button>
        {expanded && <div className="lesson-body" id={`lesson-${lesson.id}`}><p>{lesson.body}</p><div className="takeaway"><Sparkles size={15} /><span><b>Good next step</b>{lesson.takeaway}</span></div></div>}
      </article>;
    })}</div>
    <div className="learn-next"><div><span className="eyebrow">READY TO PUT IT INTO PRACTICE?</span><h2>See what you remember.</h2></div><ActionLink href="/quiz">Take the 10-question quiz</ActionLink></div>
  </div>;
}

type QuizQuestion = { prompt: string; options: string[]; correct: number; explanation: string };
const questions: QuizQuestion[] = [
  { prompt: 'What is the most useful general goal when creating a password?', options: ['Make it short and easy to type', 'Make it long and unique to that account', 'Add a symbol to your usual password', 'Use a personal detail only you know'], correct: 1, explanation: 'Length and uniqueness are powerful defenses. Personal details can often be found or guessed.' },
  { prompt: 'Why should you avoid reusing a password across accounts?', options: ['It makes passwords harder to type', 'A breach on one service can put other accounts at risk', 'It prevents multifactor authentication', 'Password managers cannot store reused passwords'], correct: 1, explanation: 'Credential stuffing uses exposed passwords against other services. Unique passwords limit the impact.' },
  { prompt: 'What is a practical role for a password manager?', options: ['Send your password to every website', 'Create and remember unique passwords', 'Replace the need for all account security', 'Make a short master password safe'], correct: 1, explanation: 'A manager helps generate and store unique credentials. Protect the manager account with a strong master passphrase and MFA.' },
  { prompt: 'What does multifactor authentication add?', options: ['A second password that is the same everywhere', 'Another proof of identity beyond your password', 'Automatic account recovery', 'A guarantee that phishing cannot happen'], correct: 1, explanation: 'MFA adds another sign-in factor, such as an authenticator approval or security key.' },
  { prompt: 'A message says your account will close unless you sign in using its link. What is the safer response?', options: ['Click quickly before the deadline', 'Reply with your password to confirm identity', 'Go directly to the service using its known address', 'Forward your one-time code to support'], correct: 2, explanation: 'Urgency is a common phishing tactic. Use a known address or bookmark instead of the message link.' },
  { prompt: 'Which password choice is most predictable?', options: ['A long set of unrelated words', 'A manager-generated random password', 'A name plus a birth year and punctuation', 'A unique passphrase for one account'], correct: 2, explanation: 'Names, dates, and familiar substitutions are common guesses. Avoid personal or predictable patterns.' },
  { prompt: 'What should you do with an unexpected request for a login code?', options: ['Share it if the message has a company logo', 'Never share it; verify through the official service', 'Post it in a support forum', 'Reuse the code as your new password'], correct: 1, explanation: 'One-time codes are intended only for you. A legitimate support agent should not ask you to disclose one.' },
  { prompt: 'Why review account recovery details?', options: ['To add more personal details to a password', 'To ensure you can regain access and recognize changes', 'To make your account visible to more people', 'To avoid using MFA'], correct: 1, explanation: 'Current recovery details make account recovery more reliable and help you spot unexpected changes.' },
  { prompt: 'You practice with a password checker. Which password should you enter?', options: ['Your current email password', 'A fictional password made only for practice', 'A password you use on a low-value account', 'Your manager master password'], correct: 1, explanation: 'Only use a fictional example. Never enter a real credential into an educational checker.' },
  { prompt: 'What is a sensible first priority for improving account security?', options: ['Change every password to the same complex string', 'Secure your email and important accounts with unique passwords and MFA', 'Write all passwords in a shared note', 'Disable account alerts'], correct: 1, explanation: 'Email often enables password resets. Start with important accounts, unique credentials, MFA, and current recovery options.' },
];

function QuizPage() {
  const { recordQuizResult } = useSessionProgress();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [review, setReview] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'success' | 'error' | 'unavailable'>('idle');
  const [message, setMessage] = useState('');
  const selected = answers[current];
  const correct = useMemo(() => answers.reduce<number>((sum, answer, index) => sum + (answer === questions[index].correct ? 1 : 0), 0), [answers]);
  const choose = (index: number) => { if (selected === null) setAnswers((previous) => previous.map((value, questionIndex) => questionIndex === current ? index : value)); };
  const retry = () => { setAnswers(Array(questions.length).fill(null)); setCurrent(0); setFinished(false); setReview(false); setSaveState('idle'); setMessage(''); recordQuizResult(null, questions.length); };
  const save = async () => {
    if (!supabaseEnabled) { setSaveState('unavailable'); setMessage('Anonymous score saving is not configured yet. Your quiz result is still available here.'); return; }
    setSaveState('pending'); setMessage('');
    try { await saveQuizResult({ score: correct, total_questions: questions.length }); setSaveState('success'); setMessage('Your quiz score was saved anonymously.'); }
    catch { setSaveState('error'); setMessage('Could not save the score right now. You can continue reviewing locally.'); }
  };
  const percentage = Math.round(correct / questions.length * 100);
  const level = percentage >= 90 ? 'Excellent Security Awareness' : percentage >= 70 ? 'Good Security Awareness' : percentage >= 50 ? 'Needs Improvement' : 'Start Learning';
  const advance = () => {
    if (current === questions.length - 1) {
      recordQuizResult(correct, questions.length);
      setFinished(true);
    } else {
      setCurrent(current + 1);
    }
  };
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="KNOWLEDGE CHECK" title="Put your security instincts to work." description="Ten practical questions. Learn from every answer, whether you get it right or not." />
    {!finished ? <section className="surface quiz-card" aria-labelledby="question-title">
      <div className="quiz-top"><span className="quiz-label"><CircleHelp size={16} /> PASSWORD SAFETY QUIZ</span><span className="quiz-counter">QUESTION <b>{String(current + 1).padStart(2, '0')}</b><span>/ 10</span></span></div>
      <div className="quiz-progress" aria-label={`Question ${current + 1} of 10`}><i style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
      <h2 id="question-title">{questions[current].prompt}</h2>
      <div className="answer-list">{questions[current].options.map((option, index) => {
        const answered = selected !== null; const right = index === questions[current].correct; const chosen = index === selected;
        return <button type="button" key={option} className={`answer-option ${answered && right ? 'answer-correct' : ''} ${answered && chosen && !right ? 'answer-wrong' : ''}`} onClick={() => choose(index)} disabled={answered} aria-pressed={chosen} data-testid={`button-answer-${current}-${index}`}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option}</span>{answered && right && <CheckCircle2 size={18} className="answer-icon good" />}{answered && chosen && !right && <X size={18} className="answer-icon wrong" />}</button>;
      })}</div>
      {selected !== null && <div className={`feedback-box ${selected === questions[current].correct ? 'feedback-good' : 'feedback-note'}`} role="status"><b>{selected === questions[current].correct ? 'That’s right.' : 'Not quite — here’s why.'}</b><p>{questions[current].explanation}</p></div>}
      <div className="quiz-controls"><span className="quiz-helper">{selected === null ? 'Choose one answer to continue.' : 'Your answer is recorded for this session.'}</span><button className="button button-primary" type="button" disabled={selected === null} onClick={advance} data-testid="button-quiz-next">{current === questions.length - 1 ? 'See my results' : 'Next question'}<ArrowRight size={15} /></button></div>
    </section> : <section className="surface quiz-results">
      <div className="result-emblem"><GraduationCap size={27} /></div><span className="eyebrow">QUIZ COMPLETE</span><h2>{level}</h2><p>You finished all ten questions. Every answer is a chance to build a safer habit.</p>
      <div className="score-summary"><div><b>{correct}<span>/10</span></b><small>CORRECT</small></div><div><b>{questions.length - correct}<span>/10</span></b><small>INCORRECT</small></div><div><b>{percentage}<span>%</span></b><small>YOUR SCORE</small></div></div>
      <div className="result-actions"><button type="button" className="button button-secondary" onClick={() => setReview(!review)} data-testid="button-toggle-review">{review ? 'Hide answer review' : 'Review answers'}<ChevronDown size={15} /></button><button type="button" className="button button-secondary" onClick={retry} data-testid="button-quiz-retry"><RotateCcw size={15} /> Try again</button><button type="button" className="button button-primary" onClick={save} disabled={saveState === 'pending'} data-testid="button-save-quiz">{saveState === 'pending' ? 'Saving…' : 'Optionally save score'}<ArrowRight size={15} /></button></div>
      {message && <p className={`save-message ${saveState}`} role="status">{message}</p>}
      {review && <div className="review-list">{questions.map((question, index) => <article key={question.prompt} className="review-item"><div className="review-head"><span className={`review-mark ${answers[index] === question.correct ? 'correct' : 'incorrect'}`}>{answers[index] === question.correct ? <Check size={13} /> : <X size={13} />}</span><b>{String(index + 1).padStart(2, '0')} · {question.prompt}</b></div><p><span>Your answer:</span> {question.options[answers[index] ?? 0]}</p><p><span>Best answer:</span> {question.options[question.correct]}</p><small>{question.explanation}</small></article>)}</div>}
    </section>}
  </div>;
}

const checklistItems = [
  { key: 'strong_unique_passwords', title: 'I use long, unique passwords for important accounts.', detail: 'Start with email, financial services, and accounts that can reset others.' },
  { key: 'avoids_personal_information', title: 'My passwords avoid easy-to-find personal details.', detail: 'Names, birthdays, pets, and familiar substitutions are easier to guess.' },
  { key: 'password_manager', title: 'I use a password manager or have a safe system.', detail: 'A manager can generate and remember a different password for each account.' },
  { key: 'multi_factor_authentication', title: 'I have multifactor authentication on important accounts.', detail: 'An authenticator app or security key adds a layer beyond your password.' },
  { key: 'avoids_password_sharing', title: 'I do not share passwords or one-time login codes.', detail: 'Keep sign-in codes private, even when a message sounds urgent.' },
  { key: 'recognizes_phishing', title: 'I pause and check before following sign-in links.', detail: 'Go directly to a known service address when a message feels unexpected.' },
  { key: 'avoids_predictable_patterns', title: 'I avoid simple sequences and repeated patterns.', detail: 'Keyboard walks and common substitutions are popular guesses.' },
  { key: 'reviews_security_settings', title: 'I review recovery details and security settings sometimes.', detail: 'Current recovery information can make a real difference when locked out.' },
] as const;
type ChecklistKey = typeof checklistItems[number]['key'];
type ChecklistState = Record<ChecklistKey, boolean>;
const blankChecklist = (): ChecklistState => Object.fromEntries(checklistItems.map((item) => [item.key, false])) as ChecklistState;
const progressWords = ['Every small step helps.', 'You have started building safer habits.', 'Good momentum. Keep going at your pace.', 'A thoughtful start to stronger security.', 'Several solid habits are taking shape.', 'You are building a strong foundation.', 'Nearly there. Keep the habits that work.', 'Excellent progress. Keep reviewing over time.', 'A strong set of everyday habits.'];

function ChecklistPage() {
  const { progress, recordChecklistAnswers } = useSessionProgress();
  const [checked, setChecked] = useState<ChecklistState>(() => ({
    ...blankChecklist(),
    ...progress.checklistAnswers,
  }));
  const [saveState, setSaveState] = useState<'idle' | 'pending' | 'success' | 'error' | 'unavailable'>('idle');
  const [message, setMessage] = useState('');
  const total = Object.values(checked).filter(Boolean).length;
  const toggle = (key: ChecklistKey) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    recordChecklistAnswers(next);
    setSaveState('idle');
    setMessage('');
  };
  const reset = () => { const next = blankChecklist(); setChecked(next); recordChecklistAnswers(next); setSaveState('idle'); setMessage(''); };
  const save = async () => {
    if (!supabaseEnabled) { setSaveState('unavailable'); setMessage('Anonymous checklist saving is not configured yet. Your selections still work in this session.'); return; }
    setSaveState('pending'); setMessage('');
    try { await saveChecklist(checked); setSaveState('success'); setMessage('Your checklist selections were saved anonymously.'); }
    catch { setSaveState('error'); setMessage('Could not save just now. Your selections remain in this session.'); }
  };
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="YOUR SECURITY CHECK-IN" title="Build a stronger routine, one step at a time." description="A gentle check-in, not a pass-or-fail test. Your selections stay in this session unless you choose to save them." />
    <div className="checklist-summary surface"><div className="progress-copy"><span className="eyebrow">YOUR CURRENT CHECK-IN</span><b>{total}<span> / 8</span></b><p>{progressWords[total]}</p></div><div className="check-progress-ring" style={{ '--progress': `${total / 8 * 100}%` } as CSSProperties}><div><b>{Math.round(total / 8 * 100)}%</b><small>CHECKED</small></div></div></div>
    <div className="checklist-items">{checklistItems.map((item, index) => <label className={`checklist-item surface ${checked[item.key] ? 'checked' : ''}`} key={item.key} data-testid={`item-checklist-${item.key}`}><input type="checkbox" checked={checked[item.key]} onChange={() => toggle(item.key)} aria-label={item.title} /><span className="custom-check">{checked[item.key] && <Check size={15} />}</span><span className="checklist-text"><span className="checklist-num">{String(index + 1).padStart(2, '0')}</span><b>{item.title}</b><small>{item.detail}</small></span><ChevronRight className="checklist-arrow" size={17} /></label>)}</div>
    <div className="checklist-footer"><button type="button" className="button button-secondary" onClick={reset} disabled={total === 0} data-testid="button-reset-checklist"><RotateCcw size={15} /> Reset check-in</button><button type="button" className="button button-primary" onClick={save} disabled={saveState === 'pending'} data-testid="button-save-checklist">{saveState === 'pending' ? 'Saving…' : 'Optionally save anonymously'}<ArrowRight size={15} /></button></div>
    {message && <p className={`save-message ${saveState}`} role="status">{message}</p>}
  </div>;
}

type Aggregates = Awaited<ReturnType<typeof loadSecurityAggregates>>;
const sampleAggregate: Aggregates = {
  strength: [{ label: 'Very Weak', count: 9 }, { label: 'Weak', count: 17 }, { label: 'Fair', count: 28 }, { label: 'Strong', count: 31 }, { label: 'Very Strong', count: 15 }],
  length: [{ label: '1–7', count: 14 }, { label: '8–11', count: 25 }, { label: '12–15', count: 30 }, { label: '16+', count: 31 }],
  characterTypes: [{ label: 'Uppercase', count: 67 }, { label: 'Lowercase', count: 83 }, { label: 'Number', count: 61 }, { label: 'Special', count: 48 }],
  totals: { evaluations: 100, quizzes: 100, checklists: 100 },
};
function HorizontalBars({ title, items, tone = 'blue', illustrative = false }: { title: string; items: { label: string; count: number }[]; tone?: string; illustrative?: boolean }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return <section className="surface chart-card"><div className="chart-title"><h3>{title}</h3>{illustrative && <span className="sample-label">ILLUSTRATIVE</span>}</div><div className="bar-chart">{items.map((item) => <div className="bar-row" key={item.label}><span>{item.label}</span><div className="bar-track"><i className={`bar-fill ${tone}`} style={{ width: `${Math.max(item.count / max * 100, 3)}%` }} /></div><b>{item.count}</b></div>)}</div></section>;
}

function DashboardPage() {
  const { progress } = useSessionProgress();
  const [data, setData] = useState<Aggregates | null>(null);
  const [state, setState] = useState<'idle' | 'pending' | 'success' | 'error' | 'unavailable'>('idle');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    if (!supabaseEnabled) { setState('unavailable'); setMessage('Aggregate insights are unavailable until anonymous data storage is configured.'); return; }
    setState('pending'); setMessage('');
    try { const result = await loadSecurityAggregates(); setData(result); setState('success'); setMessage('Aggregate insights refreshed.'); }
    catch { setState('error'); setMessage('We could not load aggregates right now. Illustrative examples are shown instead.'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const effectiveData = data && (data.totals.evaluations + data.totals.quizzes + data.totals.checklists > 0) ? data : sampleAggregate;
  const illustrative = !data || (data.totals.evaluations + data.totals.quizzes + data.totals.checklists === 0);
  const checklistTotal = checklistItems.length;
  const checklistCompleted = Object.values(progress.checklistAnswers).filter(Boolean).length;
  const checklistScore = Math.round(checklistCompleted / checklistTotal * 100);
  const quizPercentage = progress.quizScore === null || progress.quizTotal === 0
    ? 0
    : Math.round(progress.quizScore / progress.quizTotal * 100);
  const passwordPracticeScore = progress.passwordScore ?? 0;
  const securityScore = Math.round(checklistScore * 0.4 + quizPercentage * 0.35 + passwordPracticeScore * 0.25);
  return <div className="page-wrap">
    <PageIntro eyebrow="LEARNING OVERVIEW" title="Learning, at a glance." description="A calm view of the habits and topics at the heart of password safety." />
    <div className="dashboard-notice"><Info size={17} /><p><b>Your learning stays yours.</b> Your progress score uses only temporary in-memory session results and resets when this page is closed. Community insights use aggregate counts only; individual submissions stay private.</p><button type="button" className="button button-secondary compact" onClick={refresh} disabled={state === 'pending'} data-testid="button-refresh-insights">{state === 'pending' ? 'Refreshing…' : 'Refresh insights'}<RotateCcw size={14} /></button></div>
    {message && <p className={`save-message ${state}`} role="status">{message}</p>}
    {!supabaseEnabled && <div className="config-note"><span className="config-dot" /><div><b>Aggregate data are not connected</b><p>Anonymous insight loading is not configured. Charts below are clearly marked illustrative examples, not collected data.</p></div></div>}
    <div className="stat-strip">
      <div className="stat-card"><span className="stat-symbol"><Gauge size={18} /></span><small>SAFER PASSWORDS</small><b>{illustrative ? '—' : effectiveData.totals.evaluations.toLocaleString()}</b><span>{illustrative ? 'Sample scale only' : 'anonymous checks'}</span></div>
      <div className="stat-card"><span className="stat-symbol"><CircleHelp size={18} /></span><small>QUIZ ATTEMPTS</small><b>{illustrative ? '—' : effectiveData.totals.quizzes.toLocaleString()}</b><span>{illustrative ? 'Sample scale only' : 'anonymous attempts'}</span></div>
      <div className="stat-card"><span className="stat-symbol"><ClipboardCheck size={18} /></span><small>SECURITY CHECK-INS</small><b>{illustrative ? '—' : effectiveData.totals.checklists.toLocaleString()}</b><span>{illustrative ? 'Sample scale only' : 'anonymous check-ins'}</span></div>
      <div className="stat-card highlight-stat"><span className="stat-symbol"><ShieldCheck size={18} /></span><small>YOUR SECURITY SCORE</small><b>{securityScore}<i>/100</i></b><span>40% checklist · 35% quiz · 25% practice</span></div>
    </div>
    <div className="session-progress-grid">
      <div className="surface session-progress-card"><span className="eyebrow">CHECKLIST</span><b>{checklistCompleted}/{checklistTotal}</b><p>habits marked complete · {checklistScore}%</p></div>
      <div className="surface session-progress-card"><span className="eyebrow">SECURITY QUIZ</span><b>{progress.quizScore === null ? 'Not taken' : `${quizPercentage}%`}</b><p>{progress.quizScore === null ? 'Complete the 10-question quiz to add a result.' : `${progress.quizScore} of ${progress.quizTotal} correct`}</p></div>
      <div className="surface session-progress-card"><span className="eyebrow">PASSWORD PRACTICE</span><b>{progress.passwordScore === null ? 'Not checked' : `${progress.passwordScore}/100`}</b><p>Latest fictional practice estimate · never the password</p></div>
    </div>
    <p className="score-method-note">This educational estimate weights checklist completion at 40%, quiz performance at 35%, and the latest practice estimate at 25%. Unattempted activities count as zero.</p>
    <div className="chart-grid"><HorizontalBars title="Practice strength mix" items={effectiveData.strength} illustrative={illustrative} /><HorizontalBars title="Practice length groups" items={effectiveData.length} tone="green" illustrative={illustrative} /><HorizontalBars title="Character types used" items={effectiveData.characterTypes} tone="amber" illustrative={illustrative} /></div>
    <section className="dashboard-next"><div><span className="eyebrow">ONE GOOD NEXT STEP</span><h2>Keep learning at your own pace.</h2><p>There is no score to chase. Pick one account habit that feels useful and start there.</p></div><ActionLink href="/checklist">Open your check-in</ActionLink></section>
  </div>;
}

function PrivacyPage() {
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="YOUR DATA, YOUR CALL" title="Privacy is not an afterthought." description="SecurePass is designed to teach password safety without asking you to reveal a real password." />
    <div className="privacy-lead surface"><div className="privacy-emblem"><LockKeyhole size={23} /></div><div><span className="eyebrow">THE SHORT VERSION</span><h2>Practice locally. Share only what you choose.</h2><p>The password checker analyzes your fictional practice input in your browser. It is not sent to a server, saved to storage, or kept after you leave the page.</p></div></div>
    <div className="policy-grid">
      <article className="policy-card"><span className="policy-index">01</span><h3>Your practice input</h3><p>Only enter a made-up password. The checker keeps it in temporary page state and evaluates it locally. It does not use a password service, hash, analytics event, or network request.</p><span className="policy-tag green-tag"><Check size={13} /> LOCAL ONLY</span></article>
      <article className="policy-card"><span className="policy-index">02</span><h3>Optional anonymous saving</h3><p>If you choose to save an evaluation, only characteristics such as strength category and character types are submitted. The password itself is never included. Saving may be unavailable until storage is configured.</p><span className="policy-tag blue-tag"><Shield size={13} /> YOUR CHOICE</span></article>
      <article className="policy-card"><span className="policy-index">03</span><h3>Quiz and checklist</h3><p>Quiz and checklist progress lives temporarily in browser memory so the dashboard can calculate your session score. It is not written to local or session storage and resets when you close the page.</p><span className="policy-tag amber-tag"><Info size={13} /> SESSION STATE</span></article>
      <article className="policy-card"><span className="policy-index">04</span><h3>Aggregated insight</h3><p>The dashboard only loads anonymous aggregate counts after you request a refresh. It does not display individual passwords, answers, or checklist records.</p><span className="policy-tag blue-tag"><Activity size={13} /> AGGREGATES ONLY</span></article>
    </div>
    <div className="privacy-caution"><Info size={18} /><p><b>Never enter a real password into a demonstration application. Use a test password instead.</b> SecurePass is an educational practice tool, not a password manager or credential vault.</p></div>
    <div className="learn-next"><div><span className="eyebrow">WANT THE TECHNICAL VERSION?</span><h2>See how local analysis works.</h2></div><ActionLink href="/security">Security by design</ActionLink></div>
  </div>;
}

function SecurityPage() {
  const steps = [
    ['You enter a fictional password', 'The practice value is entered in the browser. Never use a credential for a real account.'],
    ['The browser analyzes it locally', 'Length, character types, and predictable patterns are checked on your device. The password is not sent, hashed, or logged.'],
    ['The browser displays your results', 'The password remains in temporary page state only. Clear it or leave the page to remove it.'],
    ['You may choose to save traits', 'Only derived, non-sensitive characteristics are submitted after you select the optional save control. The password is excluded.'],
    ['Supabase stores approved traits only', 'When configured, anonymous characteristics are saved. The dashboard shows aggregate counts, not individual passwords or records.'],
  ];
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="SECURITY BY DESIGN" title="The safest password is one we never receive." description="A clear look at the private practice flow behind SecurePass." />
    <div className="security-hero surface"><div className="security-orb"><ShieldCheck size={32} /></div><div><span className="eyebrow">LOCAL-FIRST PRACTICE</span><h2>Your real credentials are out of scope.</h2><p>SecurePass is an educational interface. Its checker is for fictional examples, and the password analysis happens entirely on your device. The password stops in your browser; only approved anonymous traits can reach Supabase.</p></div><span className="local-badge"><span /> BROWSER ONLY</span></div>
    <div className="process-list">{steps.map(([title, body], index) => <div className="process-step" key={title}><span className="process-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{body}</p></div>{index < steps.length - 1 && <span className="process-line" />}</div>)}</div>
    <div className="security-footnote"><Info size={17} /><p><b>One important boundary:</b> no browser-based educational tool should receive a password you rely on. Use only made-up practice examples, and use a reputable password manager for your real credentials.</p></div>
    <div className="learn-next"><div><span className="eyebrow">TEST THE FLOW SAFELY</span><h2>Use a password you just invented.</h2></div><ActionLink href="/checker">Open the checker</ActionLink></div>
  </div>;
}

function AboutPage() {
  return <div className="page-wrap narrow-page">
    <PageIntro eyebrow="WHY SECUREPASS EXISTS" title="Security advice should feel usable." description="A small educational project for people who want to make safer choices without feeling overwhelmed." />
    <div className="about-hero surface"><div className="about-art"><div className="about-grid-lines" /><div className="about-shield"><ShieldCheck size={47} /></div><span className="about-label">LEARN / PRACTICE / PROTECT</span></div><div className="about-copy"><span className="eyebrow">A PRACTICAL STARTING POINT</span><h2>Clear guidance, without the fear.</h2><p>Password security can feel like a list of rules that is hard to keep up with. SecurePass turns the most useful ideas into short lessons and low-pressure practice.</p><p>It is built around one simple principle: education should not require someone to expose the very credential they are trying to protect.</p></div></div>
     <div className="values-grid"><article><span className="value-number">01</span><h3>Privacy is part of the lesson.</h3><p>Practice with fictional examples. Keep real credentials private.</p></article><article><span className="value-number">02</span><h3>Small steps count.</h3><p>Useful habits matter more than a perfect score or a perfect setup.</p></article><article><span className="value-number">03</span><h3>Clarity beats alarm.</h3><p>Practical, plain-language advice makes better security easier to act on.</p></article><article><span className="value-number">04</span><h3>Built with familiar web tools.</h3><p>SecurePass uses React and TypeScript with a Vite frontend. Password checks run in the browser; optional anonymous saves use Supabase.</p></article><article><span className="value-number">05</span><h3>Room to grow.</h3><p>Future improvements can add accessible learning content and clearer privacy-preserving aggregate insights without collecting credentials.</p></article></div>
    <div className="about-links"><div><span className="eyebrow">KEEP EXPLORING</span><h2>Take one idea with you.</h2></div><div className="about-link-stack"><Link href="/learn">Read the field guide <ArrowRight size={15} /></Link><Link href="/quiz">Test your knowledge <ArrowRight size={15} /></Link><Link href="/privacy">Understand the privacy approach <ArrowRight size={15} /></Link></div></div>
  </div>;
}

function NotFoundPage() {
  return <div className="page-wrap not-found"><div className="not-found-icon"><Shield size={25} /></div><span className="eyebrow">404 / PAGE NOT FOUND</span><h1>That page isn't in this guide.</h1><p>The address may have changed, or the page may not exist.</p><ActionLink href="/">Return to SecurePass</ActionLink></div>;
}

function Router() {
  return <Shell><Switch>
    <Route path="/" component={HomePage} />
    <Route path="/checker" component={CheckerPage} />
    <Route path="/learn" component={LearnPage} />
    <Route path="/quiz" component={QuizPage} />
    <Route path="/checklist" component={ChecklistPage} />
    <Route path="/dashboard" component={DashboardPage} />
    <Route path="/privacy" component={PrivacyPage} />
    <Route path="/security" component={SecurityPage} />
    <Route path="/about" component={AboutPage} />
    <Route component={NotFoundPage} />
  </Switch></Shell>;
}

function App() {
  const [progress, setProgress] = useState<SessionProgress>({
    passwordScore: null,
    quizScore: null,
    quizTotal: 10,
    checklistAnswers: {},
  });
  const progressValue = useMemo<SessionProgressContextValue>(() => ({
    progress,
    recordPasswordScore: (score) => setProgress((previous) => ({ ...previous, passwordScore: score })),
    recordQuizResult: (score, total) => setProgress((previous) => ({ ...previous, quizScore: score, quizTotal: total })),
    recordChecklistAnswers: (answers) => setProgress((previous) => ({ ...previous, checklistAnswers: answers })),
  }), [progress]);
  return <QueryClientProvider client={queryClient}>
    <SessionProgressContext.Provider value={progressValue}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>
    </SessionProgressContext.Provider>
  </QueryClientProvider>;
}

export default App;
