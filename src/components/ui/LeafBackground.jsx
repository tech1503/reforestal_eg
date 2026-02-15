import React from 'react';
import { motion } from 'framer-motion';

// --- RUTAS SVG ---
const PATHS = {
  // 1. Hoja Calathea (Estilo de tu foto)
  calathea: "M50 95 C10 90 0 50 15 25 C25 10 75 10 85 25 C100 50 90 90 50 95 Z M50 20 L50 90 M25 35 Q35 45 50 50 M75 35 Q65 45 50 50 M20 55 Q35 60 50 65 M80 55 Q65 60 50 65",
  // 2. Ramo de Vainilla
  vanillaBranch: "M50 100 Q50 50 50 10 M50 70 Q20 60 10 40 M50 70 Q80 60 90 40 M50 40 Q30 30 20 20 M50 40 Q70 30 80 20",
  // 3. Flor de Vainilla
  vanillaFlower: "M50 50 C50 50 30 20 50 10 C70 20 50 50 50 50 Z M50 50 C50 50 80 30 90 50 C80 70 50 50 50 50 Z M50 50 C50 50 70 80 50 90 C30 80 50 50 50 50 Z M50 50 C50 50 20 70 10 50 C20 30 50 50 50 50 Z M50 50 C45 45 55 45 50 50 Z",
  // 4. Árbol Estilizado (NUEVO)
  tree: "M50 95 L45 85 Q30 80 20 65 Q10 45 25 30 Q50 5 75 30 Q90 45 80 65 Q70 80 55 85 L50 95 Z M50 85 L50 35 M35 55 Q42 65 50 70 M65 55 Q58 65 50 70"
};

const LeafBackground = () => {

  // --- ANIMACIONES ---
  const floatAnim = (duration = 14, delay = 0) => ({
    y: [0, -25, 0],
    rotate: [0, 5, 0],
    transition: { duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
  });
  const swayAnim = (duration = 18, delay = 0) => ({
    rotate: [-6, 6, -6],
    x: [-15, 15, -15],
    transition: { duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
  });
  const hangAnim = (duration = 16, delay = 0) => ({
    y: [0, 10, 0],
    rotate: [-3, 3, -3],
    scaleY: [1, 1.05, 1],
    transition: { duration, delay, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
  });

  // --- COMPONENTE PLANT MODIFICADO PARA RESPONSIVIDAD ---
  // Ahora acepta 'sizeClasses' (ej: "w-[200px] md:w-[500px]") en lugar de un 'size' fijo en style.
  const Plant = ({ path, anim, className, sizeClasses, fill = "currentColor", stroke = "none", strokeWidth = "1" }) => (
    <motion.div 
      animate={anim}
      // Aplicamos las clases de tamaño responsivas aquí
      className={`absolute pointer-events-none ${sizeClasses} ${className}`}
    >
      <svg 
        viewBox="0 0 100 100" 
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full drop-shadow-sm"
      >
        <path d={path} />
      </svg>
    </motion.div>
  );

  // Clases comunes para los colores (Modo claro sutil / Modo oscuro brillante para contraste)
  const darkColor = "text-emerald-300/30 dark:text-emerald-400/20";
  const brightColor = "text-emerald-400/40 dark:text-emerald-100/30";
  const flowerColor = "text-amber-200/50 dark:text-white/40";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-500 bg-slate-100 dark:bg-[#051c14]">
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-black/10 dark:from-emerald-900/20 dark:via-transparent dark:to-black/70" />

      {/* ================= CAPA FONDO (Árboles y Hojas Gigantes) ================= */}
      
      {/* Árbol Izquierda */}
      <Plant path={PATHS.tree} anim={swayAnim(35, 0)} 
             fill="currentColor"
             sizeClasses="w-[300px] h-[300px] md:w-[700px] md:h-[700px]" 
             className={`bottom-[-5%] -left-[20%] md:-left-[15%] ${darkColor} rotate-[-5deg]`} />

      {/* Árbol Derecha */}
      <Plant path={PATHS.tree} anim={swayAnim(32, 5)} 
             fill="currentColor"
             sizeClasses="w-[350px] h-[350px] md:w-[800px] md:h-[800px]" 
             className={`top-[-10%] -right-[25%] md:-right-[20%] ${darkColor} rotate-[10deg]`} />

      {/* Calathea Gigante Fondo */}
      <Plant path={PATHS.calathea} anim={floatAnim(28, 2)}
             fill="none" stroke="currentColor" strokeWidth="0.5"
             sizeClasses="w-[400px] h-[400px] md:w-[900px] md:h-[900px]"
             className={`top-[20%] left-[-30%] md:left-[-20%] ${darkColor} rotate-[30deg] opacity-70`} />


      {/* ================= CAPA MEDIA (Ramas y Hojas Principales) ================= */}

      {/* Ramo Vainilla Arriba */}
      <Plant path={PATHS.vanillaBranch} anim={hangAnim(25, 1)}
             fill="none" stroke="currentColor" strokeWidth="1.5"
             sizeClasses="w-[250px] h-[250px] md:w-[600px] md:h-[600px]"
             className={`top-[-5%] left-[10%] ${brightColor} rotate-[15deg]`} />

      {/* Calathea Principal Derecha (La de la foto) */}
      <Plant path={PATHS.calathea} anim={floatAnim(20, 0)}
             fill="currentColor" stroke="currentColor" strokeWidth="0.5"
             sizeClasses="w-[280px] h-[280px] md:w-[650px] md:h-[650px]"
             className={`bottom-[10%] -right-[15%] md:-right-[10%] ${brightColor} rotate-[-20deg]`} />

      {/* Ramo Vainilla Abajo Izquierda */}
      <Plant path={PATHS.vanillaBranch} anim={swayAnim(22, 3)}
             fill="none" stroke="currentColor" strokeWidth="1.5"
             sizeClasses="w-[300px] h-[300px] md:w-[700px] md:h-[700px]"
             className={`-bottom-[15%] left-[-5%] ${brightColor} rotate-[-10deg]`} />

      {/* Calathea Relleno Centro */}
       <Plant path={PATHS.calathea} anim={floatAnim(24, 4)}
             fill="none" stroke="currentColor" strokeWidth="1"
             sizeClasses="w-[150px] h-[150px] md:w-[400px] md:h-[400px]"
             className={`top-[40%] right-[30%] ${darkColor} rotate-[45deg]`} />


      {/* ================= CAPA FRONTAL (Flores y Detalles) ================= */}

      {/* Flor Vainilla Principal Arriba */}
      <Plant path={PATHS.vanillaFlower} anim={floatAnim(15, 2)}
             fill="currentColor"
             sizeClasses="w-[120px] h-[120px] md:w-[300px] md:h-[300px]"
             className={`top-[15%] right-[20%] ${flowerColor} rotate-[15deg]`} />

      {/* Flor Vainilla Abajo */}
      <Plant path={PATHS.vanillaFlower} anim={floatAnim(18, 4)}
             fill="currentColor"
             sizeClasses="w-[100px] h-[100px] md:w-[200px] md:h-[200px]"
             className={`bottom-[25%] left-[15%] ${flowerColor} -rotate-12`} />
             
       {/* Flor Vainilla Pequeña Centro */}
      <Plant path={PATHS.vanillaFlower} anim={floatAnim(20, 1)}
             fill="currentColor"
             sizeClasses="w-[80px] h-[80px] md:w-[150px] md:h-[150px]"
             className={`top-[50%] left-[40%] ${flowerColor} rotate-[30deg] opacity-80`} />


      {/* Textura de ruido */}
      <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12]" 
           style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '30px 30px' }} 
            />
    </div>
  );
};

export default LeafBackground;