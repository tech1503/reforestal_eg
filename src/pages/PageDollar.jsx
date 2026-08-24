import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Sprout,
  Globe,
  ArrowRight,
  Home,
  ShieldCheck,
  Banknote,
  CheckCircle2,
  Instagram,
  HeartHandshake
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

  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold selection:text-background overflow-x-hidden">
      
      <header className="absolute top-0 left-0 w-full z-50 p-6 lg:px-12 flex justify-end">
        <LanguageSwitcher />
      </header>

      {/* 0. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-6 lg:p-12 overflow-hidden">
        <motion.div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${imgPageDollar})`,
            y: yBg
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-darkBgDeep/50 via-darkBg/70 to-darkBgDeep backdrop-blur-[1px]" />

        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] bg-gold/20 rounded-full blur-[150px] mix-blend-screen" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          style={{ opacity: opacityHero }}
          className="relative z-10 max-w-5xl mx-auto text-center mt-20"
        >

          <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-8 drop-shadow-2xl">
            {t('pageDe.hero.title', 'Land-Dollars schaffen Regenwald')}
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-foreground max-w-3xl mx-auto font-light leading-relaxed mb-12">
            {t('pageDe.hero.subtitle', 'Reforestal und terra utopia forsten gemeinsam Regenwald auf. Reforestal fördert seine Mitglieder durch Beteiligung an Ernten wie Kakao, Bambus und Vanille, während terra utopia 100% gemeinnützig aufforstet.')}
          </motion.p>

          <motion.div variants={fadeInUp} className="flex justify-center">
            <Button
              onClick={() => window.open('https://www.betterplace.org/de/projects/88748', '_blank')}
              className="bg-gradient-to-r from-gold to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-xl px-10 py-6 rounded-full shadow-glow-lg flex items-center gap-3 transition-all transform hover:-translate-y-1 hover:scale-105"
            >
              {t('pageDe.hero.btn', 'terra utopia unterstützen')} <ArrowRight className="w-6 h-6" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* 1. WAS PASSIERT MIT MEINEM BEITRAG? */}
      <section className="relative py-32 bg-darkBgDeep border-t border-border/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-16">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full md:w-1/2 flex justify-center"
          >
            <motion.div animate={floatingAnimation} className="relative w-48 h-48 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <TreePine className="w-24 h-24 text-emerald-500" />
              <div className="absolute -bottom-4 -right-4 bg-darkBgDeep p-4 rounded-full border border-gold/50 shadow-glow">
                <ShieldCheck className="w-8 h-8 text-gold" />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="w-full md:w-1/2 text-left"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              {t('pageDe.section1.title', 'Was bewirkt dein Beitrag?')}
            </h2>
            <h3 className="text-2xl md:text-2xl text-gradient-gold font-bold mb-6">
              {t('pageDe.section1.subtitle', 'Jeder Euro kommt an!')}
            </h3>
            <p className="text-xl text-muted-foreground font-light leading-relaxed mb-4">
              {t('pageDe.section1.p1', 'Alles, was gespendet wird, fließt in unser erstes großes Aufforstungsprojekt im Amazonas. Es ermöglicht den Erwerb von Landflächen sowie die Anschaffung von Werkzeugen und Setzlingen und finanziert die notwendige Arbeitskraft.')}
            </p>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              {t('pageDe.section1.p2', 'Am Anfang steht eine ausführliche Planung gemeinsam mit unseren Expertinnen vor Ort: den indigenen Gemeinschaften und unseren Forstingenieurinnen.')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* 2. WARUM LÄUFT DAS ÜBER TERRA UTOPIA? */}
      <section className="py-32 bg-darkBg relative border-y border-border/10 overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-black text-gradient-gold mb-10">
              {t('pageDe.section2.title', 'Warum kann ich mich noch nicht an Reforestal beteiligen?')}
            </h2>

            <div className="bg-darkBgDeep/50 p-8 md:p-12 rounded-[40px] border border-white/5 shadow-xl text-left space-y-6">
              <p className="text-2xl text-white font-medium">
                {t('pageDe.section2.p1', 'Reforestal befindet sich noch in Gründung.')}
              </p>
              <p className="text-xl text-muted-foreground font-light leading-relaxed">
                {t('pageDe.section2.p2', 'Der juristischen Basis unserer Genossenschaft wird gerade der letzte Feinschliff gegeben. Danach folgt die Gründungsprüfung, bei der neben der Satzung vor allem auch unser Wirtschaftsmodell geprüft wird.')}
              </p>
            
              <p className="text-xl text-gradient-gold font-light leading-relaxed p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                {t('pageDe.section2.p4', 'Der große Erfolg unserer ersten Pilotprojekte vor Ort zeigt, dass regerativen Wirtschaftsmodellen die Zukunft gehört!')}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. WIE ARBEITEN SIE ZUSAMMEN? */}
      <section className="py-32 bg-darkBgDeep relative border-b border-border/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
              {t('pageDe.section3.title', 'Welche Rollen nehmen terra utopia und Reforestal ein?')}
            </h2>
            <p className="text-xl text-gradient-gold font-medium">
              {t('pageDe.section3.subtitle', 'Ein gemeinsames Ziel - unterschiedliche Ansätze')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-darkBg p-10 rounded-[40px] border border-white/5 relative overflow-hidden group hover:border-gold/30 transition-colors"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full pointer-events-none" />
              <motion.div animate={floatingAnimation}><Globe className="w-12 h-12 text-gold mb-8" /></motion.div>
              <h3 className="text-3xl font-black text-white mb-8">terra utopia</h3>
              <ul className="space-y-4">
                {[ (t('pageDe.section3.list1.item1', 'Kauft Land')),
                  (t('pageDe.section3.list1.item2', 'Schützt bestehenden Wald')),
                  (t('pageDe.section3.list1.item3', 'Renaturiert Ökosysteme')),
                  (t('pageDe.section3.list1.item4', 'Baut minimalinvasive Baumhäuser')),
                  (t('pageDe.section3.list1.item5', 'Hat keine Gewinnabsicht'))
                ]
                .map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg text-muted-foreground font-light">
                    <CheckCircle2 className="w-6 h-6 text-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-darkBg p-10 rounded-[40px] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <motion.div animate={floatingAnimation}><Sprout className="w-12 h-12 text-emerald-500 mb-8" /></motion.div>
              <h3 className="text-3xl font-black text-white mb-8">Reforestal</h3>
              <ul className="space-y-4">
                {[ (t('pageDe.section3.list2.item1', 'Pachtet Land')),
                  (t('pageDe.section3.list2.item2', 'Forstet Mischwald auf')),
                  (t('pageDe.section3.list2.item3', 'Erntet Nicht-Holzprodukte')),
                  (t('pageDe.section3.list2.item4', 'Verkauft die Ernten')),
                  (t('pageDe.section3.list2.item5', 'Zahlt Mitgliedern Dividenden'))
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-lg text-muted-foreground font-light">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-16 text-center max-w-3xl mx-auto p-8 bg-forest border border-emerald-500/20 rounded-3xl"
          >
            <p className="text-2xl text-gradient-gold font-light">
              {t('pageDe.section3.footer', 'So wird aus zwei Wegen ein gemeinsames Ziel: maximale Wirkung für den Regenwald.')}
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex justify-center pt-16">
            <div className="relative">
              <motion.div className="absolute inset-0 rounded-full bg-gold blur-lg opacity-20"
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Button onClick={() => window.open('https://www.betterplace.org/de/projects/88748', '_blank')}
                  className="relative overflow-hidden bg-gradient-to-r from-gold via-gold-400 to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-xl px-8 py-4 rounded-full shadow-[0_0_25px_rgba(255,200,0,0.20)] hover:shadow-[0_0_35px_rgba(255,220,80,0.35)] transition-all duration-300 hover:scale-110 hover:-translate-y-2"
                >
                  <motion.div className="absolute inset-y-0 -left-24 w-20 bg-white/40 blur-md rotate-12"
                    animate={{ x: [-100, 450] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                  />
                  <span className="relative flex items-center gap-3">
                    {t('pageDe.hero.btn2', 'Spenden')}
                    <motion.div
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
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

      {/* 4. MEHR ALS WALDSCHUTZ & DER LAND-DOLLAR */}
      <section className="py-32 bg-darkBg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16">

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <motion.div animate={floatingAnimation} className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/30">
              
              <TreePine className="w-14 h-14 text-emerald-500" />
              <Home className="absolute w-4 h-4 text-white top-6 left-5.5" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              {t('pageDe.section4.title', 'Warum Baumhäuser?')}
            </h2>
            <h3 className="text-xl text-gradient-gold font-bold mb-6">
              {t('pageDe.section4.subtitle', 'Der Regenwald soll erlebbar werden.')}
            </h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-4">
              {t('pageDe.section4.p1', 'Ein kleiner Teil der von terra utopia erworbenen Flächen wird für naturnahe Baumhäuser genutzt.')}
            </p>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-4">
              {t('pageDe.section4.p2', 'Wir brauchen Wohnraum für Besucher, Arbeiter und Anwohner. Einnahmen aus Vermietung sind für das Gesamtprojekt dabei ebenso wichtig wie konstante Präsenz die vor Raubbau schützt.')}
            </p>
            <p className="text-lg text-white font-medium">
              {t('pageDe.section4.p3', 'So profitieren Natur, lokale Bevölkerung und Gäste gleichermaßen.')}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <motion.div animate={floatingAnimation} className="w-16 h-16 bg-gold/20 rounded-2xl flex items-center justify-center mb-6 border border-gold/30">
              <Banknote className="w-12 h-12 text-gold" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              {t('pageDe.section5.title', 'Der Land-Dollar')}
            </h2>
            <h3 className="text-xl text-gradient-gold font-bold mb-6">
              {t('pageDe.section5.subtitle', 'Wahlschein des Regenwaldes.')}
            </h3>
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-4">
              {t('pageDe.section5.p1', 'Wirkmächtiger als die Wahl der Staatsvertreter ist die Wahl, wofür wir unser Geld nutzen.')}
            </p>
            {/*
            <p className="text-lg text-muted-foreground font-light leading-relaxed mb-4">
              {t('pageDe.section5.p2', 'Der Land-Dollar steht symbolisch für unser regeneratives Wirtschaftsmodell, das durch Reforestal eine Alternative zur überwiegend destruktiven Wirtschaft bietet.')}
            </p>
            */}
            
            <p className="text-lg text-white font-medium bg-white/5 p-4 rounded-xl border border-white/10">
              {t('pageDe.section5.p3', 'Reale Werte und regeneratives Wachstum, statt Ausbeutung und Zerstörung.')}
            </p>
          </motion.div>
        

          <motion.div variants={fadeInUp} className="flex justify-center pt-16 lg:col-span-2">
            <div className="relative">
              <motion.div className="absolute inset-0 rounded-full bg-gold blur-lg opacity-20"
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Button onClick={() => window.open('https://www.betterplace.org/de/projects/88748', '_blank')}
                  className="relative overflow-hidden bg-gradient-to-r from-gold via-gold-400 to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-xl px-8 py-4 rounded-full shadow-[0_0_25px_rgba(255,200,0,0.20)] hover:shadow-[0_0_35px_rgba(255,220,80,0.35)] transition-all duration-300 hover:scale-110 hover:-translate-y-2"
                >
                  <motion.div className="absolute inset-y-0 -left-24 w-20 bg-white/40 blur-md rotate-12"
                    animate={{ x: [-100, 450] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: "linear" }}
                  />
                  <span className="relative flex items-center gap-3">
                    {t('pageDe.hero.btn3', 'Jetzt Land sichern')}
                    <motion.div
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
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

      {/* 5. CTA: REFORESTAL STARTET BALD */}
      <section className="py-32 relative bg-forest overflow-hidden border-t border-border/10">
        <div className="absolute inset-0 bg-gradient-to-t from-darkBgDeep via-darkBgDeep/80 to-transparent z-0" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-4xl mx-auto px-6 text-center relative z-10"
        >
          <motion.div variants={fadeInUp} animate={floatingAnimation} className="w-24 h-24 bg-gradient-to-r from-gold to-gold-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-glow-lg">
            <HeartHandshake className="w-12 h-12 text-darkBgDeep" />
          </motion.div>

          <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-black text-white mb-6">
            {t('pageDe.cta.title', 'Reforestal startet bald')}
          </motion.h2>

          <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-white/90 mb-4 font-light leading-relaxed">
            {t('pageDe.cta.p1', 'Die Genossenschaft befindet sich aktuell in Gründung.')}
          </motion.p>

          <motion.p variants={fadeInUp} className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t('pageDe.cta.p2', 'Wenn du dich trotzdem bereits beteiligen möchtest, kannst du bei terra utopia Mitglied werden und uns auf social media folgen.')}
          </motion.p>

          <motion.div
            variants={fadeInUp}
            className="flex flex-col items-center gap-5 justify-center max-w-xl mx-auto"
          >
            {/* Botón principal */}
            <div className="relative w-full">
              <motion.div
                className="absolute inset-0 rounded-full bg-gold blur-lg opacity-20"
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.15, 0.35, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <motion.div
                animate={{ scale: [1, 1.03, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <Button
                  onClick={() =>
                    window.open(
                      'https://terrautopia.webling.eu/forms/memberform/66892e52b0566b063253',
                      '_blank'
                    )
                  }
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-gold via-gold-400 to-gold-600 hover:from-gold-600 hover:to-gold text-darkBgDeep font-black text-lg md:text-xl px-6 py-6 md:py-7 rounded-full shadow-[0_0_25px_rgba(255,200,0,0.20)] transition-all duration-300 hover:scale-[1.02]"
                >
                  {/* Flash que atraviesa completamente el botón */}
                  <motion.div
                    className="pointer-events-none absolute top-0 bottom-0 -left-[30%] w-[25%] bg-white/50 blur-md rotate-12"
                    animate={{
                      left: ['-30%', '110%'],
                    }}
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      ease: 'linear',
                    }}
                  />

                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {t('pageDe.cta.btn1', 'Werde Mitglied')}
                    <ArrowRight className="w-6 h-6 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Button>
              </motion.div>
            </div>

            {/* Instagram */}
            <Button
              onClick={() =>
                window.open(
                  'https://www.instagram.com/reforestal/',
                  '_blank'
                )
              }
              aria-label="Reforestal auf Instagram folgen"
              className="mt-10 w-14 h-14 md:w-16 md:h-16 bg-darkBgDeep/50 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 hover:border-white rounded-full transition-all duration-300 hover:scale-110"
            >
              <Instagram className="w-6 h-6 md:w-8 md:h-8" />
            </Button>
          </motion.div>
              
        </motion.div>
      </section>

    </div>
  );
};

export default PageDollar;
