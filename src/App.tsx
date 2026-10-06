import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Heart,
  Leaf,
  ListTodo,
  Menu,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  X,
  Zap,
} from 'lucide-react'

type Energy = 'low' | 'steady' | 'high'
type BlockKind = 'task' | 'commitment' | 'break'

type ScheduleBlock = {
  id: string
  title: string
  start: number
  end: number
  kind: BlockKind
  done: boolean
}

type DayPlan = {
  date: string
  energy: Energy
  intention: string
  dayStart: number
  dayEnd: number
  blocks: ScheduleBlock[]
  unscheduled: string[]
}

const STORAGE_KEY = 'daywell-plan-v2'
const energyOptions: { id: Energy; label: string; detail: string; icon: typeof Leaf }[] = [
  { id: 'low', label: 'Taking it slow', detail: 'Keep things gentle', icon: Leaf },
  { id: 'steady', label: 'Doing alright', detail: 'A little of everything', icon: Sun },
  { id: 'high', label: 'Ready to go', detail: 'Let’s make the most of it', icon: Zap },
]

function isScheduleBlock(value: unknown): value is ScheduleBlock {
  if (typeof value !== 'object' || value === null) return false
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'start' in value &&
    typeof value.start === 'number' &&
    Number.isFinite(value.start) &&
    'end' in value &&
    typeof value.end === 'number' &&
    Number.isFinite(value.end) &&
    value.end > value.start &&
    'kind' in value &&
    (value.kind === 'task' || value.kind === 'commitment' || value.kind === 'break') &&
    'done' in value &&
    typeof value.done === 'boolean' &&
    value.start >= 0 &&
    value.end <= 24 * 60
  )
}

function isDayPlan(value: unknown): value is DayPlan {
  if (typeof value !== 'object' || value === null) return false
  return (
    'date' in value &&
    typeof value.date === 'string' &&
    'energy' in value &&
    (value.energy === 'low' || value.energy === 'steady' || value.energy === 'high') &&
    'intention' in value &&
    typeof value.intention === 'string' &&
    'dayStart' in value &&
    typeof value.dayStart === 'number' &&
    'dayEnd' in value &&
    typeof value.dayEnd === 'number' &&
    value.dayEnd > value.dayStart &&
    'blocks' in value &&
    Array.isArray(value.blocks) &&
    value.blocks.every(isScheduleBlock) &&
    'unscheduled' in value &&
    Array.isArray(value.unscheduled) &&
    value.unscheduled.every((task) => typeof task === 'string')
  )
}

function readSavedPlan(): { plan: DayPlan | null; error: string | null } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { plan: null, error: null }
    const parsed: unknown = JSON.parse(saved)
    return isDayPlan(parsed)
      ? { plan: parsed, error: null }
      : { plan: null, error: 'Your saved plan could not be read. Make a fresh plan to replace it.' }
  } catch {
    return { plan: null, error: 'Your saved plan could not be read. Make a fresh plan to replace it.' }
  }
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function formatTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  const suffix = hours >= 12 ? 'pm' : 'am'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`
}

function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function localDateString(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function validTime(value: string): boolean {
  const match = value.match(/^(?:0?[0-9]|1[0-9]|2[0-3]):([0-5]\d)$/)
  return match !== null
}

function createSchedule(
  start: number,
  end: number,
  energy: Energy,
  tasks: string[],
  commitments: string[],
): { blocks: ScheduleBlock[]; unscheduled: string[] } {
  const events = commitments.flatMap((line) => {
    const match = line.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)$/)
    if (!match) return []
    const eventStart = minutesFromTime(match[1])
    const eventEnd = minutesFromTime(match[2])
    if (eventStart >= eventEnd || eventStart < start || eventEnd > end) return []
    return [{
      id: crypto.randomUUID(),
      title: match[3].trim(),
      start: eventStart,
      end: eventEnd,
      kind: 'commitment' as const,
      done: false,
    }]
  }).sort((a, b) => a.start - b.start)

  const duration = energy === 'low' ? 35 : energy === 'high' ? 60 : 45
  const taskBlocks: ScheduleBlock[] = tasks.slice(0, 8).map((title) => ({
    id: crypto.randomUUID(),
    title,
    start: 0,
    end: duration,
    kind: 'task',
    done: false,
  }))
  const output: ScheduleBlock[] = []
  let cursor = start
  let taskIndex = 0

  const placeTasksUntil = (limit: number) => {
    while (taskIndex < taskBlocks.length && cursor + duration <= limit) {
      const task = taskBlocks[taskIndex]
      output.push({ ...task, start: cursor, end: cursor + duration })
      cursor += duration
      taskIndex += 1
      if (taskIndex < taskBlocks.length && cursor + 10 <= limit) {
        output.push({
          id: crypto.randomUUID(),
          title: 'A little breathing room',
          start: cursor,
          end: cursor + 10,
          kind: 'break',
          done: false,
        })
        cursor += 10
      }
    }
  }

  for (const event of events) {
    if (event.start < cursor) continue
    placeTasksUntil(event.start)
    output.push(event)
    cursor = event.end
  }
  placeTasksUntil(end)

  return {
    blocks: output.sort((a, b) => a.start - b.start),
    unscheduled: taskBlocks.slice(taskIndex).map((task) => task.title),
  }
}

function App() {
  const today = localDateString()
  const [savedState] = useState(readSavedPlan)
  const [plan, setPlan] = useState<DayPlan | null>(savedState.plan)
  const [storageError, setStorageError] = useState(savedState.error)
  const [showSetup, setShowSetup] = useState(() => !savedState.plan)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [addTaskError, setAddTaskError] = useState('')
  const [newTask, setNewTask] = useState('')
  const [energy, setEnergy] = useState<Energy>('steady')
  const [startTime, setStartTime] = useState('08:30')
  const [endTime, setEndTime] = useState('17:30')
  const [intention, setIntention] = useState('')
  const [taskText, setTaskText] = useState('')
  const [commitmentText, setCommitmentText] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!plan) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
      setStorageError(null)
    } catch {
      setStorageError('Your plan could not be saved in this browser. It will be lost when you leave this page.')
    }
  }, [plan])

  const completedCount = plan?.blocks.filter((block) => block.done && block.kind === 'task').length ?? 0
  const taskCount = plan?.blocks.filter((block) => block.kind === 'task').length ?? 0
  const completion = taskCount ? Math.round((completedCount / taskCount) * 100) : 0
  const groupedBlocks = useMemo(() => {
    if (!plan) return []
    const groups = new Map<string, ScheduleBlock[]>()
    for (const block of plan.blocks) {
      const period = block.start < 12 * 60 ? 'Morning' : block.start < 17 * 60 ? 'Afternoon' : 'Evening'
      groups.set(period, [...(groups.get(period) ?? []), block])
    }
    return [...groups.entries()]
  }, [plan])

  function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const start = minutesFromTime(startTime)
    const end = minutesFromTime(endTime)
    if (!validTime(startTime) || !validTime(endTime) || end <= start) {
      setFormError('Your day needs to end after it starts.')
      return
    }
    const tasks = taskText.split('\n').map((task) => task.trim()).filter(Boolean)
    if (!tasks.length) {
      setFormError('Add at least one thing you would like to make time for.')
      return
    }
    if (tasks.length > 8 || tasks.some((task) => task.length > 100)) {
      setFormError('Add up to 8 priorities, with no more than 100 characters each.')
      return
    }
    const validCommitments = commitmentText.split('\n').map((line) => line.trim()).filter(Boolean)
    const parsedCommitments = validCommitments.map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)$/)
      if (!match || !match[3].trim() || !validTime(match[1]) || !validTime(match[2])) return null
      const eventStart = minutesFromTime(match[1])
      const eventEnd = minutesFromTime(match[2])
      if (eventStart >= eventEnd || eventStart < start || eventEnd > end) return null
      return { start: eventStart, end: eventEnd }
    })
    const sortedCommitments = parsedCommitments.filter((event) => event !== null).sort((a, b) => a.start - b.start)
    const hasOverlap = sortedCommitments.some((event, index) => index > 0 && event.start < sortedCommitments[index - 1].end)
    if (parsedCommitments.some((event) => event === null) || hasOverlap) {
      setFormError('Use “9:00-10:00 Team check-in” for each commitment. Times must fit your day and not overlap.')
      return
    }
    const schedule = createSchedule(start, end, energy, tasks, validCommitments)
    setPlan({
      date: today,
      energy,
      intention: intention.trim(),
      dayStart: start,
      dayEnd: end,
      blocks: schedule.blocks,
      unscheduled: schedule.unscheduled,
    })
    setShowSetup(false)
  }

  function toggleBlock(id: string) {
    setPlan((current) => current ? {
      ...current,
      blocks: current.blocks.map((block) => block.id === id ? { ...block, done: !block.done } : block),
    } : current)
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = newTask.trim()
    if (!title || !plan) return
    const duration = plan.energy === 'low' ? 35 : plan.energy === 'high' ? 60 : 45
    let cursor = plan.dayStart
    let start: number | null = null
    for (const block of [...plan.blocks].sort((a, b) => a.start - b.start)) {
      if (cursor + duration <= block.start) start = cursor
      cursor = Math.max(cursor, block.end)
    }
    if (cursor + duration <= plan.dayEnd) start = cursor
    if (start === null) {
      setAddTaskError('There isn’t enough open time in this plan. Rethink your day to make room first.')
      return
    }
    setPlan({
      ...plan,
      blocks: [...plan.blocks, {
        id: crypto.randomUUID(),
        title,
        start,
        end: start + duration,
        kind: 'task' as const,
        done: false,
      }].sort((a, b) => a.start - b.start),
    })
    setNewTask('')
    setAddTaskError('')
    setShowAddTask(false)
  }

  function resetPlan() {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setStorageError(null)
    } catch {
      setStorageError('Your saved plan could not be cleared from this browser.')
    }
    setPlan(null)
    setShowSetup(true)
    setTaskText('')
    setCommitmentText('')
    setIntention('')
    setEnergy('steady')
    setShowAddTask(false)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" aria-label="Daywell home">
          <span className="brand-mark"><Sunrise size={19} strokeWidth={2.2} /></span>
          <span>daywell<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav aria-label="Main navigation" className="side-nav">
          <button className="nav-item nav-item-active" onClick={() => { setShowSetup(false); setMenuOpen(false) }}>
            <ListTodo size={18} /> <span>My day</span><span className="nav-today">TODAY</span>
          </button>
          <button className="nav-item" onClick={() => { setShowSetup(true); setMenuOpen(false) }}>
            <Sparkles size={18} /> <span>Plan a day</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="gentle-note">
            <span className="note-icon"><Heart size={16} /></span>
            <p>A gentle reminder</p>
            <span>You don’t have to do it all to have a good day.</span>
          </div>
          <div className="local-note"><span className="privacy-dot" /> Saved just on this device</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb">Your space <span>/</span> <strong>{showSetup ? 'Plan a day' : 'My day'}</strong></div>
          <div className="topbar-right">
            <span className="local-status"><span className="privacy-dot" /> Private to this browser</span>
            <button className="avatar" aria-label="Open day planner settings" onClick={() => setShowSetup(true)}>D</button>
          </div>
        </header>
        {storageError && <div className="storage-notice" role="alert">{storageError}</div>}

        {showSetup ? (
          <section className="setup-wrap" aria-labelledby="setup-title">
            <div className="setup-heading">
              <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE SPACE TO PLAN</div>
              <h1 id="setup-title">Let’s make today<br />feel a little <em>more yours.</em></h1>
              <p>No perfect routines required. Tell us what your day is really like, and we’ll help make a plan that fits.</p>
            </div>
            <form className="planner-form" onSubmit={handleCreatePlan}>
              <div className="form-section">
                <div className="section-heading">
                  <span className="step-number">01</span>
                  <div><h2>How are you arriving today?</h2><p>Your energy is a good place to start.</p></div>
                </div>
                <div className="energy-options" role="radiogroup" aria-label="How is your energy today?">
                  {energyOptions.map(({ id, label, detail, icon: Icon }) => (
                    <label className={`energy-option ${energy === id ? 'energy-selected' : ''}`} key={id}>
                      <input type="radio" name="energy" value={id} checked={energy === id} onChange={() => setEnergy(id)} />
                      <span className="energy-icon"><Icon size={18} /></span><span className="energy-copy"><strong>{label}</strong><small>{detail}</small></span>
                      <span className="radio-indicator" />
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <div className="section-heading">
                  <span className="step-number">02</span>
                  <div><h2>What’s already on your plate?</h2><p>Set your hours and make space for the things that can’t move.</p></div>
                </div>
                <div className="hours-row">
                  <label className="field-label">MY DAY STARTS <span className="time-input-wrap"><Sunrise size={15} /><input aria-label="Day start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></span></label>
                  <span className="hours-divider">to</span>
                  <label className="field-label">MY DAY ENDS <span className="time-input-wrap"><Sunset size={15} /><input aria-label="Day end time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></span></label>
                </div>
                <label className="field-label textarea-label" htmlFor="commitments">FIXED PLANS <span className="optional-label">OPTIONAL</span></label>
                <textarea id="commitments" className="text-area commitments-area" maxLength={1000} value={commitmentText} onChange={(event) => setCommitmentText(event.target.value)} placeholder={'9:00-9:30 Team check-in\n12:00-13:00 Lunch with Sam'} rows={2} />
                <span className="field-hint">One per line, with a start and end time. We’ll plan around them.</span>
              </div>

              <div className="form-section">
                <div className="section-heading">
                  <span className="step-number">03</span>
                  <div><h2>What would make today feel good?</h2><p>Pick a few things that matter. Everything else can wait.</p></div>
                </div>
                <label className="field-label" htmlFor="priorities">THINGS I’D LIKE TO MAKE TIME FOR</label>
                <textarea id="priorities" className="text-area" maxLength={1200} value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder={'Finish the project proposal\nGet outside for a walk\nCall Mum'} rows={3} required />
                <span className="field-hint">Put your most important things first. One per line, up to 8.</span>
                <label className="field-label intention-label" htmlFor="intention">MY LITTLE INTENTION <span className="optional-label">OPTIONAL</span></label>
                <input id="intention" className="text-input" value={intention} onChange={(event) => setIntention(event.target.value)} maxLength={120} placeholder="e.g. Leave a little room to breathe" />
              </div>

              {formError && <div className="form-error" role="alert">{formError}</div>}
              <div className="form-submit-row">
                <span className="submit-reassurance"><Heart size={14} /> A plan, not a promise.</span>
                <button className="primary-button" type="submit">Make my day <ArrowRight size={17} /></button>
              </div>
            </form>
          </section>
        ) : plan ? (
          <section className="day-view" aria-labelledby="day-title">
            <div className="day-heading">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> YOUR DAY, YOUR PACE</div>
                <h1 id="day-title">A day with <em>a little room.</em></h1>
                <p className="day-date"><Sun size={16} /> {dayLabel(plan.date)}</p>
              </div>
              <button className="outline-button" onClick={() => setShowSetup(true)}><RotateCcw size={15} /> Rethink my day</button>
            </div>
            <div className="intention-card">
              <span className="intention-icon"><Heart size={17} /></span>
              <div><span className="intention-caption">A NOTE TO YOURSELF</span><p>{plan.intention || 'You don’t have to do it all to have a good day.'}</p></div>
              <span className="intention-sparkle"><Sparkles size={17} /></span>
            </div>
            <div className="overview-row">
              <div className="progress-card">
                <div className="progress-top"><span>TODAY’S MOMENTUM</span><strong>{completedCount}<small> / {taskCount} priorities</small></strong></div>
                <div className="progress-track" role="progressbar" aria-label="Day's priorities completed" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={taskCount || 1}><span style={{ width: `${completion}%` }} /></div>
                <div className="progress-caption">{completion === 100 ? 'Everything you set out to do. Lovely.' : 'Every small step counts. You’re doing just fine.'}</div>
              </div>
              <button className="add-task-button" onClick={() => { setAddTaskError(''); setShowAddTask(true) }}><span><Plus size={18} /></span><strong>Add a little something</strong><ArrowUpRight size={16} /></button>
            </div>
            {groupedBlocks.length ? (
              <div className="schedule">
                {groupedBlocks.map(([period, blocks]) => (
                  <section className="schedule-period" key={period} aria-labelledby={`period-${period}`}>
                    <div className="period-heading"><h2 id={`period-${period}`}>{period}</h2><span>{blocks.length} {blocks.length === 1 ? 'moment' : 'moments'}</span></div>
                    <div className="period-items">
                      {blocks.map((block) => (
                        <article className={`schedule-item ${block.kind} ${block.done ? 'block-done' : ''}`} key={block.id}>
                          <div className="item-time"><span>{formatTime(block.start)}</span><span>{formatTime(block.end)}</span></div>
                          <span className="timeline-line" aria-hidden="true"><i /></span>
                          <div className="item-card">
                            <div className="item-icon">{block.kind === 'break' ? <Coffee size={17} /> : block.kind === 'commitment' ? <Clock3 size={17} /> : <Check size={17} />}</div>
                            <div className="item-content"><span className="item-type">{block.kind === 'task' ? 'A PRIORITY' : block.kind === 'commitment' ? 'ALREADY ON YOUR CALENDAR' : 'A MOMENT TO RESET'}</span><h3>{block.title}</h3><span className="item-duration">{block.end - block.start} min{block.kind === 'task' && plan.energy === 'low' ? ' · gentle focus' : ''}</span></div>
                            {block.kind === 'task' && <button className={`complete-button ${block.done ? 'complete-button-done' : ''}`} aria-label={`${block.done ? 'Mark incomplete' : 'Mark complete'}: ${block.title}`} onClick={() => toggleBlock(block.id)}>{block.done ? <Check size={17} /> : <span />}</button>}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : <div className="empty-schedule"><Coffee size={25} /><p>A day with room to breathe. Add a little something whenever you’re ready.</p></div>}
            {plan.unscheduled.length > 0 && (
              <section className="unscheduled-card" aria-labelledby="unscheduled-title">
                <h2 id="unscheduled-title">Still on your list</h2>
                <p>These didn’t fit into the hours you set. You can rethink your day and make room for them.</p>
                <ul>{plan.unscheduled.map((task, index) => <li key={`${task}-${index}`}>{task}</li>)}</ul>
                <button className="outline-button" onClick={() => setShowSetup(true)}>Rethink my day <ArrowRight size={14} /></button>
              </section>
            )}
            <footer className="day-footer"><span><Heart size={14} /> Your day doesn’t have to go to plan for it to be a good one.</span><button onClick={resetPlan}>Start fresh <ChevronDown size={14} /></button></footer>
          </section>
        ) : (
          <section className="empty-state">
            <span className="empty-icon"><Sunrise size={28} /></span><h1>Your day is still unwritten.</h1><p>Take a moment to check in with yourself, then make a plan that fits the day you’re actually having.</p>
            <button className="primary-button" onClick={() => setShowSetup(true)}>Plan my day <ArrowRight size={17} /></button>
          </section>
        )}
      </main>
      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}

      {showAddTask && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddTask(false) }}>
          <section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
            <button className="modal-close" aria-label="Close" onClick={() => setShowAddTask(false)}><X size={19} /></button>
            <span className="modal-icon"><Plus size={20} /></span>
            <h2 id="add-modal-title">One more thing?</h2>
            <p>We’ll find a little space for it at the end of your plan.</p>
            <form onSubmit={addTask}><label className="field-label" htmlFor="new-task">WHAT’S ON YOUR MIND?</label><input autoFocus id="new-task" className="text-input" maxLength={100} required value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="A small thing, a big thing…" />{addTaskError && <div className="form-error modal-error" role="alert">{addTaskError}</div>}<button className="primary-button modal-submit" type="submit">Add to my day <ArrowDown size={16} /></button></form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
