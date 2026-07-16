import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Sprout,
  MapPin,
  Leaf,
  HeartHandshake,
  Globe,
  ArrowRight,
  ChevronDown,
  Droplets,
  Home,
  Users,
  Sun,
  ShieldCheck,
  Microscope,
  Cloud,
  Milestone,
  Coins,
  Combine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import imgPageDollar from '@/assets/vegetacion-ref-arbol.webp';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const floatingAnimation = {
  y: [0, -15, 0],
  transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
};

const PageDollar = () => {
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold selection:text-background overflow-x-hidden">
      
      <header className="absolute top-0 left-0 w-full z-50 p-6 lg:px-12 flex justify-end">
        <LanguageSwitcher />
      </header>

      {/* 0. HERO SECTION: EL INICIO DEL VIAJE */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
        <motion.div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${imgPageDollar})`,
            y: yBg
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-darkBgDeep/50 via-darkBg/70 to-darkBgDeep backdrop-blur-[1px]" />
        
        {/* Luces decorativas */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[150px] mix-blend-screen" />
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          style={{ opacity: opacityHero }}
          className="relative z-10 max-w-6xl mx-auto text-center mt-20"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center justify-center gap-4 px-6 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6 shadow-glow">
            <Milestone className="w-5 h-5 text-gold" />
            <span className="text-sm md:text-base font-medium tracking-widest text-gradient-gold uppercase">
              {t('pageDollar.hero.badge', 'El Camino de la Regeneración')}
            </span>
          </motion.div>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gold-200 font-light tracking-wide mb-6">
            {t('pageDollar.hero.welcome', '¡Qué bien que hayas descubierto este camino!')}
          </motion.p>

          <motion.h1 variants={fadeInUp} className="text-3xl md:text-5xl lg:text-7xl font-black text-white leading-tight mb-8 drop-shadow-2xl">
            {t('pageDollar.hero.title', 'Más que una Utopía:')} <br/>
            <span className="text-gradient-gold animate-shine">
              {t('pageDollar.hero.titleHighlight', 'Toda gran transformación comienza con una visión compartida')}
            </span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg md:text-2xl text-white/80 max-w-4xl mx-auto font-light leading-relaxed mb-12">
            {t('pageDollar.hero.subtitle', 'terra utopia y Reforestal se unen para sanar la Amazonía en Ecuador. Tu donación es el motor de esta transformación. Con tu apoyo pasamos a la acción: protegemos la selva metro a metro y garantizamos la prosperidad de las comunidades locales.')}
          </motion.p>

          <motion.p variants={fadeInUp} className="text-lg md:text-2xl text-gradient-gold font-light tracking-wide mb-10">
            {t('pageDollar.hero.descrip', 'Con tu apoyo, cada m² de selva Amazónica se convierte en un legado de vida y prosperidad para las generaciones futuras.')}
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-6">
            <Button 
              onClick={() => window.open('https://www.betterplace.org/de/projects/88748-terra-utopia-baumhaeuser-im-regenwald-leben-als-teil-der-natur', '_blank')}
              className="bg-gradient-to-r from-gold to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-xl px-8 py-4 rounded-full shadow-glow-lg flex items-center gap-3 transition-all transform hover:-translate-y-1"
            >
              {t('pageDollar.cta.btnDonate', 'Donar a terra utopia')} <ArrowRight className="w-6 h-6" />
            </Button>
            
            <Button 
              onClick={() => window.open('https://terra-utopia.com/', '_blank')}
              variant="outline"
              className="bg-darkBgDeep/50 backdrop-blur-md border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold text-xl px-8 py-4 rounded-full transition-all"
            >
              {t('pageDollar.cta.btnVisit', 'Visitar terra utopia')}
            </Button>
          </motion.div>
        </motion.div>

          {/* Botón flecha interactivo para scroll 
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer z-10"
          onClick={() => scrollToSection('historia')}
        >
          <ChevronDown className="w-12 h-12 text-white/40 hover:text-gold transition-colors" />
        </motion.div>
         */}
      </section>

      {/* 1. EL ORIGEN: DOS FUERZAS */}
      <section id="historia" className="relative py-32 bg-darkBgDeep border-t border-border/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-4xl mx-auto mb-20">
            <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-4 block">
              {t('pageDollar.history.badges', 'El Origen')}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-8">
              {t('pageDollar.history.title', 'Dos Fuerzas, Un Mismo Sueño')}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Terra Utopia */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-darkBg p-10 md:p-14 rounded-[40px] relative border border-white/5"
            >
              <motion.div animate={floatingAnimation} className="w-20 h-20 bg-gold/20 rounded-3xl flex items-center justify-center mb-8 shadow-glow">
                <Globe className="w-10 h-10 text-gold" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4">
                {t('pageDollar.history.terraTitle', 'terra utopia')}
              </h3>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {t('pageDollar.history.terraDesc', 'Nació en Alemania como una organización sin fines de lucro con un propósito profundo: reconectar a personas de todo el mundo con socios comunitarios en la Amazonía ecuatoriana. Su filosofía siempre ha sido demostrar que un alto nivel de vida no tiene por qué estar ligado a la destrucción del medio ambiente; es posible reunir a la humanidad en un "mundo verde" mediante la educación y la restauración colectiva.')}
              </p>
            </motion.div>

            {/* Reforestal */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-darkBg p-10 md:p-14 rounded-[40px] relative border border-white/5"
            >
              <motion.div animate={floatingAnimation} className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/30">
                <Sprout className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <h3 className="text-3xl font-black text-white mb-4">
                {t('pageDollar.history.reforestalTitle', 'Reforestal')}
              </h3>
              <p className="text-lg text-muted-foreground font-light leading-relaxed">
                {t('pageDollar.history.reforestalDesc', 'Comenzó en 2024 como una alianza biocultural. Los fundadores comprendieron que plantar árboles como simples donaciones no era suficiente para salvar la Amazonía. Querían ir más allá de la filantropía y crear un modelo verdaderamente profesional, combinando la innovación tecnológica con la sabiduría milenaria.')}
              </p>
            </motion.div>
          </div>
            
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center max-w-3xl mx-auto p-8 bg-forest border border-gold/20 rounded-3xl"
          >
            <p className="text-xl text-white font-light leading-relaxed">
              {t('pageDollar.history.allianceConclusion', 'Hoy, terra utopia y Reforestal forjan una alianza hacia el futuro. terra utopia aporta su red global, mientras Reforestal desarrolla la plataforma de impacto. Juntos, no solo buscan proteger el ecosistema, sino transformarlo en un motor de desarrollo que perdure en el tiempo.')}
            </p>
          </motion.div>

            {/* BOTON PARA DONAR */}
            <motion.div
                variants={fadeInUp}
                className="flex justify-center pt-20"
                >
                <div className="relative">

                    {/* Glow animado */}
                    <motion.div
                    className="absolute inset-0 rounded-full bg-gold blur-lg opacity-40"
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.25, 0.55, 0.25],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    />

                    <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                    >
                    <Button
                        onClick={() =>
                        window.open(
                            'https://www.betterplace.org/de/projects/88748-terra-utopia-baumhaeuser-im-regenwald-leben-als-teil-der-natur',
                            '_blank'
                        )
                        }
                        className="
                        relative
                        overflow-hidden
                        bg-gradient-to-r
                        from-gold
                        via-gold-400
                        to-gold-600
                        hover:from-gold-600
                        hover:to-gold
                        text-darkBgDeep
                        font-black
                        text-xl
                        px-8
                        py-4
                        rounded-full
                        shadow-[0_0_35px_rgba(255,200,0,0.45)]
                        hover:shadow-[0_0_55px_rgba(255,220,80,0.8)]
                        transition-all
                        duration-300
                        hover:scale-110
                        hover:-translate-y-2
                        "
                    >
                        {/* Brillo que atraviesa el botón */}
                        <motion.div
                        className="absolute inset-y-0 -left-24 w-20 bg-white/40 blur-md rotate-12"
                        animate={{
                            x: [-100, 450],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                            ease: "linear",
                        }}
                        />

                        <span className="relative flex items-center gap-3">
                            {t('pageDollar.cta.btnDonate', 'Donar a terra utopia')}

                        <motion.div
                            animate={{
                            x: [0, 6, 0],
                            }}
                            transition={{
                            duration: 1,
                            repeat: Infinity,
                            }}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </motion.div>
                        </span>
                    </Button>
                    </motion.div>
                </div>
            </motion.div>


        </div>
        
      </section>

      {/* 2. EL PASO A PASO (PILARES DE LA HISTORIA) */}
      <section className="py-32 bg-darkBg relative border-y border-border/10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              {t('pageDollar.stepByStep.title', 'Construyendo el Futuro, Paso a Paso')}
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
              {t('pageDollar.stepByStep.subtitle', 'A través de esta historia conjunta, hemos construido un sistema basado en los siguientes pilares que dan vida a nuestro proyecto:')}
            </p>
          </div>

          {/* Timeline / Pasos */}
          <div className="space-y-24">
            
            {/* Paso 1: Reforestación */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16"
            >
              <div className="w-full md:w-1/2 flex justify-end">
                <motion.div animate={floatingAnimation} className="w-32 h-32 bg-darkBgDeep rounded-full border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <TreePine className="w-16 h-16 text-emerald-500" />
                </motion.div>
              </div>
              <div className="w-full md:w-1/2 text-left">
                <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-2 block">
                  {t('pageDollar.stepByStep.step1Badge', 'Paso 1: Territorio')}
                </span>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {t('pageDollar.stepByStep.step1Title', 'Reforestación Medible')}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {t('pageDollar.stepByStep.step1Desc', 'La historia de la selva no se cuenta por la cantidad de árboles plantados, sino por el territorio asegurado. No plantamos un árbol que se convierte en un simple dato; protegemos ecosistemas completos. Medimos nuestro éxito garantizando metros cuadrados (m²) específicos de selva amazónica, asegurando el hábitat desde sus cimientos.')}
                </p>
              </div>
            </motion.div>

            {/* Paso 2: Beneficios */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16"
            >
              <div className="w-full md:w-1/2 flex justify-start">
                <motion.div animate={floatingAnimation} className="w-32 h-32 bg-darkBgDeep rounded-full border border-gold/50 flex items-center justify-center shadow-glow">
                  <Coins className="w-16 h-16 text-gold" />
                </motion.div>
              </div>
              <div className="w-full md:w-1/2 text-right">
                <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-2 block">
                  {t('pageDollar.stepByStep.step2Badge', 'Paso 2: Modelo Económico')}
                </span>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {t('pageDollar.stepByStep.step2Title', 'Beneficios y Ganancias')}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {t('pageDollar.stepByStep.step2Desc', 'Hemos decidido cambiar el rumbo de la historia económica. Al sustituir la antigua lógica extractiva de la tierra por un modelo regenerativo, demostramos que la ética y la rentabilidad pueden coexistir.  Estamos profundamente comprometidos con la misión de restaurar la simbiosis entre la humanidad y la naturaleza. El objetivo es crear una relación sostenible y verdaderamente compatible entre el medio ambiente, la economía y la sociedad.')}
                </p>
              </div>
            </motion.div>

            {/* Paso 3: Chakra */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex flex-col md:flex-row items-center gap-8 md:gap-16"
            >
              <div className="w-full md:w-1/2 flex justify-end">
                <motion.div animate={floatingAnimation} className="w-32 h-32 bg-darkBgDeep rounded-full border border-emerald-500/50 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Combine className="w-16 h-16 text-emerald-500" />
                </motion.div>
              </div>
              <div className="w-full md:w-1/2 text-left">
                <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-2 block">
                  {t('pageDollar.stepByStep.step3Badge', 'Paso 3: Biodiversidad')}
                </span>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {t('pageDollar.stepByStep.step3Title', 'Cultivos Mixtos y Chakra')}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {t('pageDollar.stepByStep.step3Desc', 'Nos negamos a plantar una sola especie. El corazón productivo de nuestra historia late gracias a la Chakra amazónica. Más que un simple sistema agrícola, es un diseño ancestral de bosque productivo donde especies como el cacao y la vainilla crecen en simbiosis, restaurando la fertilidad del suelo.')}
                </p>
              </div>
            </motion.div>

            {/* Paso 4: Cooperativa */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex flex-col md:flex-row-reverse items-center gap-8 md:gap-16"
            >
              <div className="w-full md:w-1/2 flex justify-start">
                <motion.div animate={floatingAnimation} className="w-32 h-32 bg-darkBgDeep rounded-full border border-gold/50 flex items-center justify-center shadow-glow">
                  <ShieldCheck className="w-16 h-16 text-gold" />
                </motion.div>
              </div>
              <div className="w-full md:w-1/2 text-right">
                <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-2 block">
                  {t('pageDollar.stepByStep.step4Badge', 'Paso 4: La Estructura')}
                </span>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {t('pageDollar.stepByStep.step4Title', 'Fase Inicial y Futura Cooperativa eG')}
                </h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  {t('pageDollar.stepByStep.step4Desc', 'Actualmente, estamos en nuestra "Fase Inicial", reuniendo el capital para establecer la primera Cooperativa Alemana (eG) de este tipo. Esto asegurará una independencia total bajo una estricta regulación y transparencia. Quienes nos apoyen ahora se convertirán en "Aliados Guardianes", co-creadores desde el primer momento.')}
                </p>
              </div>
            </motion.div>

            {/* BOTON PARA DONAR */}
            <motion.div
                variants={fadeInUp}
                className="flex justify-center pt-10"
                >
                <div className="relative">

                    {/* Glow animado */}
                    <motion.div
                    className="absolute inset-0 rounded-full bg-gold blur-lg opacity-40"
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.25, 0.55, 0.25],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    />

                    <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                    >
                    <Button
                        onClick={() =>
                        window.open(
                            'https://www.betterplace.org/de/projects/88748-terra-utopia-baumhaeuser-im-regenwald-leben-als-teil-der-natur',
                            '_blank'
                        )
                        }
                        className="
                        relative
                        overflow-hidden
                        bg-gradient-to-r
                        from-gold
                        via-gold-400
                        to-gold-600
                        hover:from-gold-600
                        hover:to-gold
                        text-darkBgDeep
                        font-black
                        text-xl
                        px-8
                        py-4
                        rounded-full
                        shadow-[0_0_35px_rgba(255,200,0,0.45)]
                        hover:shadow-[0_0_55px_rgba(255,220,80,0.8)]
                        transition-all
                        duration-300
                        hover:scale-110
                        hover:-translate-y-2
                        "
                    >
                        {/* Brillo que atraviesa el botón */}
                        <motion.div
                        className="absolute inset-y-0 -left-24 w-20 bg-white/40 blur-md rotate-12"
                        animate={{
                            x: [-100, 450],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                            ease: "linear",
                        }}
                        />

                        <span className="relative flex items-center gap-3">
                            {t('pageDollar.cta.btnDonate', 'Donar a terra utopia')}

                        <motion.div
                            animate={{
                            x: [0, 6, 0],
                            }}
                            transition={{
                            duration: 1,
                            repeat: Infinity,
                            }}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </motion.div>
                        </span>
                    </Button>
                    </motion.div>
                </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 3. TODOS GANAN (IMPACTO) */}
      <section className="py-32 bg-forest relative border-y border-border/10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-gold/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-20">
            <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-4 block">
              {t('pageDollar.impact.badge', 'Impacto Sistémico')}
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              {t('pageDollar.impact.title', 'Todos Ganan')}
            </h2>
            <p className="text-xl text-muted-foreground font-light max-w-3xl mx-auto">
              {t('pageDollar.impact.subtitle', 'En esta nueva historia, hemos diseñado un modelo donde la viabilidad del capital y la salud del ecosistema son inseparables. Cada parte del tejido vivo sale victoriosa:')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div whileHover={{ y: -10 }} className="bg-darkBg rounded-3xl p-8 border border-white/5 shadow-xl">
              <Cloud className="w-10 h-10 text-emerald-500 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">{t('pageDollar.impact.climateTitle', 'Clima')}</h3>
              <p className="text-muted-foreground leading-relaxed">{t('pageDollar.impact.climateDesc', 'Restauramos sumideros de carbono vitales, implementando medidas innovadoras y reales contra el cambio climático.')}</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-darkBg rounded-3xl p-8 border border-white/5 shadow-xl">
              <Users className="w-10 h-10 text-gold mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">{t('pageDollar.impact.humanityTitle', 'Humanidad')}</h3>
              <p className="text-muted-foreground leading-relaxed">{t('pageDollar.impact.humanityDesc', 'Curamos la separación entre las personas y su entorno. Transformamos la eco-ansiedad en "eco-agencia": la capacidad de actuar.')}</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-darkBg rounded-3xl p-8 border border-white/5 shadow-xl">
              <Home className="w-10 h-10 text-emerald-500 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">{t('pageDollar.impact.localTitle', 'Población Local')}</h3>
              <p className="text-muted-foreground leading-relaxed">{t('pageDollar.impact.localDesc', 'Aseguramos que la conservación genere prosperidad. Las familias de Napo obtienen un sustento seguro siendo guardianes del territorio.')}</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-darkBg rounded-3xl p-8 border border-white/5 shadow-xl lg:col-span-2">
              <HeartHandshake className="w-10 h-10 text-gold mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">{t('pageDollar.impact.membersTitle', 'Miembros de la Cooperativa')}</h3>
              <p className="text-muted-foreground leading-relaxed">{t('pageDollar.impact.membersDesc', 'Quienes apoyan el proyecto pasan de ser espectadores a co-propietarios. A FUTURO, disfrutarán de participación democrática, derechos de voto en decisiones estratégicas y acceso a datos transparentes.')}</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-darkBg rounded-3xl p-8 border border-white/5 shadow-xl">
              <Leaf className="w-10 h-10 text-emerald-500 mb-6" />
              <h3 className="text-2xl font-bold text-white mb-3">{t('pageDollar.impact.floraTitle', 'Flora, Fauna y Hongos')}</h3>
              <p className="text-muted-foreground leading-relaxed">{t('pageDollar.impact.floraDesc', 'No creamos plantaciones, regeneramos hogares. La restauración del suelo nutre las redes de microorganismos, devolviéndole el pulso a la selva.')}</p>
            </motion.div>
          </div>

          {/* BOTON PARA DONAR */}
            <motion.div
                variants={fadeInUp}
                className="flex justify-center pt-24"
                >
                <div className="relative">

                    {/* Glow animado */}
                    <motion.div
                    className="absolute inset-0 rounded-full bg-gold blur-lg opacity-40"
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.25, 0.55, 0.25],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    />

                    <motion.div
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                    }}
                    >
                    <Button
                        onClick={() =>
                        window.open(
                            'https://www.betterplace.org/de/projects/88748-terra-utopia-baumhaeuser-im-regenwald-leben-als-teil-der-natur',
                            '_blank'
                        )
                        }
                        className="
                        relative
                        overflow-hidden
                        bg-gradient-to-r
                        from-gold
                        via-gold-400
                        to-gold-600
                        hover:from-gold-600
                        hover:to-gold
                        text-darkBgDeep
                        font-black
                        text-xl
                        px-8
                        py-4
                        rounded-full
                        shadow-[0_0_35px_rgba(255,200,0,0.45)]
                        hover:shadow-[0_0_55px_rgba(255,220,80,0.8)]
                        transition-all
                        duration-300
                        hover:scale-110
                        hover:-translate-y-2
                        "
                    >
                        {/* Brillo que atraviesa el botón */}
                        <motion.div
                        className="absolute inset-y-0 -left-24 w-20 bg-white/40 blur-md rotate-12"
                        animate={{
                            x: [-100, 450],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            repeatDelay: 1,
                            ease: "linear",
                        }}
                        />

                        <span className="relative flex items-center gap-3">
                            {t('pageDollar.cta.btnDonate', 'Donar a terra utopia')}

                        <motion.div
                            animate={{
                            x: [0, 6, 0],
                            }}
                            transition={{
                            duration: 1,
                            repeat: Infinity,
                            }}
                        >
                            <ArrowRight className="w-6 h-6" />
                        </motion.div>
                        </span>
                    </Button>
                    </motion.div>
                </div>
            </motion.div>

        </div>
      </section>

      {/* 4. RESULTADOS (MÉTRICAS) */}
      <section className="py-32 relative bg-darkBgDeep overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="flex flex-col lg:flex-row gap-16 items-center"
          >
            {/* Texto de las Metricas */}
            <div className="w-full lg:w-1/2">
              <span className="text-gradient-gold font-bold tracking-widest uppercase text-sm mb-4 block">
                {t('pageDollar.metrics.badge', 'La Realidad de Campo')}
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                {t('pageDollar.metrics.title', 'Potencial de Rendimiento')}
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-8">
                {t('pageDollar.metrics.desc', 'Esta visión no es solo una teoría romántica; ya es una realidad validada en el campo. Junto a las familias locales en Napo, Ecuador, hemos medido los resultados de nuestro proyecto piloto de simbiosis de cacao y vainilla, que avalan nuestra metodología:')}
              </p>
            </div>

            {/* Metricas Grid */}
            <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-darkBg p-6 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
                <Sprout className="w-10 h-10 text-emerald-500 mb-4" />
                <p className="text-4xl font-black text-white mb-2">{t('pageDollar.metrics.val1', '>90%')}</p>
                <p className="text-xs text-emerald-500 uppercase tracking-wider">{t('pageDollar.metrics.label1', 'Supervivencia')}</p>
              </div>
              <div className="bg-darkBg p-6 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
                <TreePine className="w-10 h-10 text-emerald-500 mb-4" />
                <p className="text-4xl font-black text-white mb-2">{t('pageDollar.metrics.val2', '125cm')}</p>
                <p className="text-xs text-emerald-500 uppercase tracking-wider">{t('pageDollar.metrics.label2', 'Crecimiento (8m)')}</p>
              </div>
              <div className="bg-darkBg p-6 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
                <Droplets className="w-10 h-10 text-emerald-500 mb-4" />
                <p className="text-4xl font-black text-white mb-2">{t('pageDollar.metrics.val3', '100%')}</p>
                <p className="text-xs text-emerald-500 uppercase tracking-wider">{t('pageDollar.metrics.label3', 'Autosuficiencia Hídrica')}</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 5. CALL TO ACTION FINAL */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity" />
        <div className="absolute inset-0 bg-gradient-to-t from-darkBgDeep via-darkBgDeep/80 to-darkBg" />
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto px-6 text-center relative z-10"
        >
          <motion.div variants={fadeInUp} className="w-24 h-24 bg-gradient-to-r from-gold to-gold-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-glow-lg">
            <HeartHandshake className="w-12 h-12 text-darkBgDeep" />
          </motion.div>
          
          <motion.h2 variants={fadeInUp} className="text-5xl md:text-7xl font-black text-white mb-8">
            {t('pageDollar.cta.title', 'Sé Parte de la Historia')}
          </motion.h2>
          
          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gradient-gold mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            {t('pageDollar.cta.subtitle', 'Te ofrecemos la capacidad de actuar. Sé parte del movimiento y apoya la preservación de la selva con terra utopia y Reforestal.')}
          </motion.p>
          
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-6 mt-16">
            <Button 
              onClick={() => window.open('https://www.betterplace.org/de/projects/88748-terra-utopia-baumhaeuser-im-regenwald-leben-als-teil-der-natur', '_blank')}
              className="bg-gradient-to-r from-gold to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-xl px-8 py-4 rounded-full shadow-glow-lg flex items-center gap-3 transition-all transform hover:-translate-y-1"
            >
              {t('pageDollar.cta.btnDonate', 'Donar a terra utopia')} <ArrowRight className="w-6 h-6" />
            </Button>
            
            <Button 
              onClick={() => window.open('https://terra-utopia.com/', '_blank')}
              variant="outline"
              className="bg-darkBgDeep/50 backdrop-blur-md border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold text-xl px-8 py-4 rounded-full transition-all"
            >
              {t('pageDollar.cta.btnVisit', 'Visitar terra utopia')}
            </Button>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-12 text-sm text-muted-foreground uppercase tracking-widest">
            {t('pageDollar.cta.footer', '"Cada paso cuenta, y tú también puedes formar parte de este movimiento."')}
          </motion.p>
        </motion.div>
      </section>

    </div>
  );
};

export default PageDollar;