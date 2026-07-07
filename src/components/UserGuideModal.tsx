import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Columns, 
  History, 
  MessageSquare, 
  Eye, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  ShieldAlert,
  ArrowRight,
  BookmarkCheck,
  Zap
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideStep {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  bgLight: string;
  description: string;
  details: string[];
  roleTip: {
    agency: string;
    client: string;
  };
}

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps: GuideStep[] = [
    {
      title: 'Bienvenido a SocialFlow',
      subtitle: 'La herramienta definitiva de co-creación y aprobación de contenido',
      icon: Sparkles,
      color: 'text-indigo-600',
      bgLight: 'bg-indigo-50',
      description: 'SocialFlow conecta de forma ágil a redactores, diseñadores, directores creativos y clientes en un espacio único. Olvídate de los hilos eternos de correos y exceles de planificación.',
      details: [
        'Organización centralizada de ideas y publicaciones.',
        'Flujo de aprobación paso a paso transparente.',
        'Control de versiones de copies, captions y diseños.',
        'Canal de comentarios y feedback directo sobre cada post.'
      ],
      roleTip: {
        agency: 'Usa esta plataforma para presentar tus propuestas de copies y creatividades de manera visual e interactiva.',
        client: 'Usa esta plataforma para revisar el contenido que la agencia prepara para ti, dar feedback en tiempo real y aprobar lo que esté listo para publicar.'
      }
    },
    {
      title: '1. Planificación en el Calendario',
      subtitle: 'Visualiza y planifica el contenido de forma cronológica',
      icon: Calendar,
      color: 'text-blue-600',
      bgLight: 'bg-blue-50',
      description: 'El calendario es el corazón de la planificación. Permite ver la distribución temporal de tus posts en redes sociales para evitar vacíos en la estrategia.',
      details: [
        'Puedes ver qué posts saldrán cada día del mes.',
        'Haz clic en el botón "+" que aparece al pasar el cursor sobre cualquier día para crear una nueva idea directamente en esa fecha.',
        'Filtra por proyectos o marcas usando la barra de selección superior.',
        'Cada color representa la fase de producción actual del post.'
      ],
      roleTip: {
        agency: 'Programa las publicaciones con suficiente antelación para que el cliente tenga tiempo de revisarlas.',
        client: 'Observa la frecuencia y el ritmo de las publicaciones programadas de un solo vistazo.'
      }
    },
    {
      title: '2. Flujo de Producción (Board)',
      subtitle: 'El ciclo de vida de un post desde la idea hasta la publicación',
      icon: Columns,
      color: 'text-purple-600',
      bgLight: 'bg-purple-50',
      description: 'La vista de producción "Board" (tablero Kanban) organiza el contenido en 7 columnas secuenciales. Arrastra y suelta tarjetas para avanzar de fase.',
      details: [
        'Fases de agencia: "Idea Inicial", "Idea Aceptada", "En Copy" y "En Diseño".',
        'Fases de validación: "Revisión Cliente" (visible para el cliente), "Aprobado" y "Publicado".',
        'Arrastrar y soltar: Mueve tarjetas entre columnas para actualizar su estado de manera instantánea.',
        'Limitación de Rol: Solo los miembros de la agencia pueden mover tarjetas libremente.'
      ],
      roleTip: {
        agency: 'Mantén el tablero actualizado para que el resto del equipo sepa en qué se está trabajando.',
        client: 'Solo verás los posts cuando entren en la columna "Revisión Cliente". ¡Nada de ideas a medio cocinar!'
      }
    },
    {
      title: '3. Versiones y Feedback Interno',
      subtitle: 'Guarda borradores y mantén debates confidenciales',
      icon: History,
      color: 'text-amber-600',
      bgLight: 'bg-amber-50',
      description: 'Hemos incorporado un potente control de versiones y espacio para anotaciones internas exclusivo para la agencia.',
      details: [
        'Guarda versiones: Guarda instantáneas del texto de la creatividad, del copy del post, o del diseño en cualquier momento.',
        'Restaura con un clic: Recupera cualquier versión anterior del historial en segundos.',
        'Comentarios Internos: Espacio confidencial para que redactores y diseñadores discutan detalles antes de mostrar la propuesta al cliente.'
      ],
      roleTip: {
        agency: 'Asegura tus ideas y mantén una conversación fluida y privada dentro del equipo de la agencia utilizando los comentarios de versión.',
        client: 'Toda la cocina de la agencia se queda detrás de bambalinas. Solo verás la propuesta pulida final.'
      }
    },
    {
      title: '4. Revisión y Comentarios del Cliente',
      subtitle: 'Feedback sin malentendidos y etiquetas personalizadas',
      icon: MessageSquare,
      color: 'text-rose-600',
      bgLight: 'bg-rose-50',
      description: 'La pestaña de comentarios y feedbacks del post es donde ocurre la magia de la comunicación.',
      details: [
        'Menciones con @: Etiqueta a otros miembros escribiendo "@nombre" en el chat para enviar una notificación visual por correo.',
        'Feedback estructurado: El cliente puede crear una lista de "Tareas pendientes (Feedbacks)".',
        'Check de resolución: El equipo de la agencia puede marcar cada feedback del cliente como "Hecho" cuando esté corregido.'
      ],
      roleTip: {
        agency: 'Revisa siempre la lista de tareas de feedback del cliente para asegurarte de cubrir todas las correcciones.',
        client: 'Crea feedbacks puntuales y claros para que la agencia sepa exactamente qué corregir en el diseño o copy.'
      }
    },
    {
      title: '5. Simulador de Feed Realista',
      subtitle: 'Comprueba el impacto visual antes de publicar',
      icon: Eye,
      color: 'text-pink-600',
      bgLight: 'bg-pink-50',
      description: 'Tanto la agencia como el cliente pueden ver las publicaciones simuladas en las cuadrículas de Instagram y LinkedIn para validar la estética.',
      details: [
        'Feed de Instagram: Mira cómo se distribuyen tus imágenes estáticas, reels o carruseles en el grid de la cuenta.',
        'Feed de LinkedIn: Visualiza el diseño del post corporativo, el texto extendido y la interacción profesional.',
        'Filtro dinámico: Previsualiza el contenido programado para planificar la estética visual (el "feed aesthetic").'
      ],
      roleTip: {
        agency: 'Usa estas vistas para convencer al cliente de que el orden y la paleta de colores de las creatividades son idóneos.',
        client: 'Haz clic en cualquier post en la cuadrícula para ver el detalle definitivo tal como se verá en tu móvil.'
      }
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('socialflow_guide_seen', 'true');
    onClose();
  };

  const ActiveStep = steps[currentStep];
  const IconComponent = ActiveStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col md:flex-row h-[550px]"
      >
        {/* Left Side: Step Indicator Panel */}
        <div className="w-full md:w-52 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                <BookOpen size={14} />
              </div>
              <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">Guía de Uso</span>
            </div>
            
            <div className="space-y-2 hidden md:block">
              {steps.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 ${
                    currentStep === idx 
                      ? 'bg-white text-indigo-600 shadow-sm border border-slate-150' 
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentStep === idx ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <span className="truncate">{s.title.split('. ').pop()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-semibold mt-4 hidden md:block">
            Paso {currentStep + 1} de {steps.length}
          </div>
        </div>

        {/* Right Side: Step Content Area */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${ActiveStep.bgLight} ${ActiveStep.color} shadow-sm`}>
                <IconComponent size={24} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                  PASO {currentStep + 1} DE {steps.length}
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1">
                  {ActiveStep.title}
                </h3>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
              title="Cerrar guía"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 my-6 overflow-y-auto pr-2 space-y-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{ActiveStep.subtitle}</p>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {ActiveStep.description}
            </p>

            {/* List of Details */}
            <div className="space-y-2 pt-1">
              {ActiveStep.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <BookmarkCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-600 font-semibold leading-relaxed">{detail}</span>
                </div>
              ))}
            </div>

            {/* Role tips section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={11} className="text-indigo-600" />
                  <span className="text-[9px] font-black text-indigo-800 uppercase tracking-wider">Como Agencia</span>
                </div>
                <p className="text-[10px] text-indigo-950/80 font-medium leading-relaxed">
                  {ActiveStep.roleTip.agency}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <BookmarkCheck size={11} className="text-emerald-600" />
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">Como Cliente</span>
                </div>
                <p className="text-[10px] text-emerald-950/80 font-medium leading-relaxed">
                  {ActiveStep.roleTip.client}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-xl transition-all ${
                currentStep === 0 
                  ? 'opacity-0 cursor-default' 
                  : 'text-slate-500 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <ChevronLeft size={16} />
              Atrás
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Saltar guía
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-indigo-600/10 active:scale-95"
              >
                {currentStep === steps.length - 1 ? 'Entendido, ¡empezar!' : 'Siguiente'}
                {currentStep < steps.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
