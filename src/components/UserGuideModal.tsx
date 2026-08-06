import React, { useState, ComponentType, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useModalA11y } from '../lib/useModalA11y';
import { MODAL_MOTION, PHASE_TIMELINE_ORDER, PHASES, Role, cn } from '../lib/utils';
import Button from './Button';
import IconButton from './IconButton';
import PhaseBadge from './PhaseBadge';
import { InstagramIcon, LinkedInIcon, TikTokIcon } from './SocialIcons';
import {
  X,
  Columns,
  LayoutDashboard,
  Lightbulb,
  Eye,
  MessageSquare,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ArrowRight,
  ArrowDown,
  Download,
  History as HistoryIcon,
  CalendarDays,
  Languages,
  Save
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: Role;
}

interface GuideStep {
  title: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
  bgLight: string;
  lead: string;
  points?: string[];
  visual: ReactNode;
}

/** The app's real phase sequence, read from the same PHASES/PHASE_TIMELINE_ORDER
 *  every other view uses — rename or reorder a phase there and this updates
 *  itself, instead of silently going stale like the guide's old hand-typed
 *  phase names did. `dimFrom` grays out everything before a given phase, for
 *  the client step that shows where their visibility actually starts. */
function PhasePipeline({ dimFrom }: { dimFrom?: (typeof PHASE_TIMELINE_ORDER)[number] }) {
  const dimIndex = dimFrom ? PHASE_TIMELINE_ORDER.indexOf(dimFrom) : -1;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1 flex-wrap">
        {PHASE_TIMELINE_ORDER.map((phase, i) => (
          <React.Fragment key={phase}>
            <PhaseBadge phase={phase} className={cn(dimIndex >= 0 && i < dimIndex && 'opacity-30')} />
            {i < PHASE_TIMELINE_ORDER.length - 1 && <ArrowRight size={12} className="text-ink-muted shrink-0" />}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pl-1">
        <ArrowDown size={12} className="text-orange-400 shrink-0" />
        <PhaseBadge phase="changes_requested" />
        <span className="text-caption text-ink-muted">vuelve a Diseño si el cliente pide cambios</span>
      </div>
    </div>
  );
}

function FeatureRow({ items }: { items: { icon: ComponentType<{ size?: number; className?: string }>; label: string }[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map(({ icon: Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-ink-secondary">
          <Icon size={14} />
          {label}
        </span>
      ))}
    </div>
  );
}

const TAB_MOCK = [
  { label: 'La Idea', icon: Lightbulb, active: false },
  { label: 'Producción', icon: CheckCircle, active: true },
  { label: 'Comentarios', icon: MessageSquare, active: false },
  { label: 'Historial', icon: HistoryIcon, active: false },
];

function TabStripMock() {
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {TAB_MOCK.map((tab) => (
        <span
          key={tab.label}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold',
            tab.active ? 'bg-white text-app-accent shadow-sm' : 'text-ink-muted'
          )}
        >
          <tab.icon size={13} />
          {tab.label}
        </span>
      ))}
    </div>
  );
}

const AGENCY_STEPS: GuideStep[] = [
  {
    title: 'El flujo de un post',
    icon: Columns,
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    lead: 'Cada post avanza por una secuencia fija de fases, con un desvío automático si el cliente pide cambios.',
    points: [
      'Avanza desde la barra de fase del propio post, o arrastrando su tarjeta en el Board.',
      '"Cambios Solicitados" no es una fase más — es un aviso que devuelve el post a Diseño.',
    ],
    visual: <PhasePipeline />,
  },
  {
    title: 'Dónde se trabaja',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bgLight: 'bg-blue-50',
    lead: 'Tres vistas cubren todo el ciclo: qué necesita tu atención, cuándo publica cada cosa y en qué fase está.',
    points: [
      'El Dashboard prioriza lo urgente: cambios pedidos, próximas publicaciones y atrasos — no solo contadores.',
      'Filtra el Calendario y el Board por fase, plataforma, territorio o "asignado a mí".',
    ],
    visual: (
      <FeatureRow
        items={[
          { icon: LayoutDashboard, label: 'Dashboard' },
          { icon: CalendarDays, label: 'Calendario' },
          { icon: Columns, label: 'Board' },
        ]}
      />
    ),
  },
  {
    title: 'Producir un post',
    icon: Lightbulb,
    color: 'text-amber-600',
    bgLight: 'bg-amber-50',
    lead: 'Cada post tiene su propio espacio con una pestaña para cada parte del proceso.',
    points: [
      'El copy admite traducción manual, independiente del texto original.',
      'Guarda versiones del copy, caption o diseño en cualquier momento y restáuralas cuando quieras.',
      'Comentarios internos y Feedback del cliente son dos canales separados — el cliente nunca ve el primero.',
    ],
    visual: (
      <div className="space-y-2">
        <TabStripMock />
        <div className="flex items-center gap-3 text-caption text-ink-muted">
          <span className="inline-flex items-center gap-1"><Languages size={12} /> Traducción manual</span>
          <span className="inline-flex items-center gap-1"><Save size={12} /> Versiones</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Previsualizar y publicar',
    icon: Eye,
    color: 'text-pink-600',
    bgLight: 'bg-pink-50',
    lead: 'Simula cómo se verá cada post en Instagram, LinkedIn y TikTok antes de publicarlo.',
    points: [
      '"Listo para Publicar" descarga las creatividades (ZIP o PDF según formato) y copia el caption en un clic.',
    ],
    visual: (
      <FeatureRow
        items={[
          { icon: InstagramIcon, label: 'Instagram' },
          { icon: LinkedInIcon, label: 'LinkedIn' },
          { icon: TikTokIcon, label: 'TikTok' },
          { icon: Download, label: 'Listo para Publicar' },
        ]}
      />
    ),
  },
];

const CLIENT_STEPS: GuideStep[] = [
  {
    title: 'Qué ves y cuándo',
    icon: Eye,
    color: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    lead: 'Ves el post desde que empieza a redactarse el copy — la idea inicial es trabajo interno de la agencia.',
    visual: <PhasePipeline dimFrom="copy" />,
  },
  {
    title: 'Revisar y dar feedback',
    icon: MessageSquare,
    color: 'text-rose-600',
    bgLight: 'bg-rose-50',
    lead: 'Cada post tiene una pestaña de Feedback solo para ti, separada de las notas internas de la agencia.',
    points: ['Marca cada punto como una tarea; la agencia la resuelve y la marca como hecha.'],
    visual: (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-900">
        <MessageSquare size={14} className="shrink-0" />
        "Ajustar el tono del copy, es demasiado informal"
      </div>
    ),
  },
  {
    title: 'Aprobar o pedir cambios',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    lead: 'Cuando un post llega a Revisión Cliente, decides si sigue adelante o vuelve a producción.',
    points: ['Pedir cambios devuelve el post a Diseño junto con el motivo que escribas.'],
    visual: (
      <div className="flex gap-2">
        <span className="flex-1 text-center bg-white border border-orange-300 text-orange-700 px-3 py-2 rounded-xl text-xs font-bold">
          Solicitar Cambios
        </span>
        <span className="flex-[1.5] text-center bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold">
          Aprobar Post
        </span>
      </div>
    ),
  },
];

export default function UserGuideModal({ isOpen, onClose, userRole }: UserGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  // Any dismissal counts as "seen" — skipping shouldn't be different from
  // finishing, or the auto-open-on-first-login effect in App.tsx would keep
  // reopening this on the next unrelated state change.
  const handleClose = () => {
    localStorage.setItem('socialflow_guide_seen', 'true');
    onClose();
  };
  const containerRef = useModalA11y(handleClose);

  if (!isOpen) return null;

  const steps = userRole === 'client' ? CLIENT_STEPS : AGENCY_STEPS;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const ActiveStep = steps[currentStep];
  const IconComponent = ActiveStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-guide-title"
        tabIndex={-1}
        {...MODAL_MOTION}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-divider flex flex-col md:flex-row min-h-[550px] outline-none"
      >
        {/* Step navigation — a horizontal scroll row on phones, a vertical
            list on md+. The original hid this entirely below md, leaving
            mobile with no progress indicator and no way to jump steps. */}
        <div className="w-full md:w-52 bg-slate-50 border-b md:border-b-0 md:border-r border-divider p-3 sm:p-4 md:p-6 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-3 md:mb-6">
              <div className="p-1.5 bg-app-accent text-white rounded-lg">
                <BookOpen size={14} />
              </div>
              <span className="text-[11px] font-extrabold text-ink uppercase tracking-widest">Guía de Uso</span>
            </div>

            <div className="flex md:flex-col gap-2 md:gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
              {steps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  aria-current={currentStep === idx ? 'step' : undefined}
                  className={cn(
                    'shrink-0 md:w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 whitespace-nowrap',
                    currentStep === idx
                      ? 'bg-white text-app-accent shadow-sm border border-divider'
                      : 'text-ink-muted hover:text-ink-secondary hover:bg-slate-100'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', currentStep === idx ? 'bg-app-accent' : 'bg-slate-300')} />
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="text-caption text-ink-muted mt-3 md:mt-4">
            Paso {currentStep + 1} de {steps.length}
          </div>
        </div>

        {/* Step Content Area */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-3 rounded-2xl shadow-sm', ActiveStep.bgLight, ActiveStep.color)}>
                <IconComponent size={24} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-app-accent uppercase tracking-widest bg-app-accent/10 px-2 py-0.5 rounded-md">
                  PASO {currentStep + 1} DE {steps.length}
                </span>
                <h3 id="user-guide-title" className="text-lg font-black text-ink tracking-tight mt-1">
                  {ActiveStep.title}
                </h3>
              </div>
            </div>
            <IconButton icon={X} onClick={handleClose} aria-label="Cerrar guía" title="Cerrar guía" />
          </div>

          <div className="flex-1 my-6 overflow-y-auto pr-2 space-y-4">
            <p className="text-xs text-ink-secondary leading-relaxed font-medium">{ActiveStep.lead}</p>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="p-3 bg-gray-50/70 rounded-xl border border-divider"
              >
                {ActiveStep.visual}
              </motion.div>
            </AnimatePresence>

            {ActiveStep.points && ActiveStep.points.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {ActiveStep.points.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-ink-secondary font-semibold leading-relaxed">
                    <span className="w-1 h-1 rounded-full bg-ink-muted shrink-0 mt-1.5" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-divider shrink-0">
            <Button variant="secondary" onClick={handlePrev} disabled={currentStep === 0}>
              <ChevronLeft size={16} />
              Atrás
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} className="text-ink-muted hover:text-ink-secondary">
                Saltar guía
              </Button>

              <Button variant="primary" onClick={handleNext} className="shadow-app-accent/10">
                {currentStep === steps.length - 1 ? 'Entendido, ¡empezar!' : 'Siguiente'}
                {currentStep < steps.length - 1 && <ChevronRight size={16} />}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
