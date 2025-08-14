import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Util: horário de Brasília
function nowBrasilia() {
  const offset = -3; // Brasília UTC-3
  const now = new Date();
  const localTime = now.getTime();
  const localOffset = now.getTimezoneOffset() * 60000;
  return new Date(localTime + localOffset + 3600000 * offset);
}

function formatHM(d: Date) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function gerarSequenciaCoresAleatorias(qtd: number) {
  const cores = ["🟥⬜", "⬛⬜"];
  const arr: string[] = [];
  for (let i = 0; i < qtd; i++) arr.push(cores[Math.floor(Math.random() * cores.length)]);
  return arr;
}

function randomNivelMercado(): { label: string; tone: "cheio" | "estavel" | "baixo" } {
  const levels = [
    { label: "Cheio", tone: "cheio" as const },
    { label: "Estável", tone: "estavel" as const },
    { label: "Baixo", tone: "baixo" as const },
  ];
  return levels[Math.floor(Math.random() * levels.length)];
}

function randomConfianca(): number {
  return Math.floor(Math.random() * (92 - 60 + 1)) + 60;
}

const toneClass: Record<string, string> = {
  cheio: "text-primary",
  estavel: "text-secondary",
  baixo: "text-accent",
};

const Index = () => {
  // Estado geral
  const [inicio, setInicio] = useState<string>(formatHM(nowBrasilia()));
  const [entries, setEntries] = useState<Array<{ hora: string; forca: string; cor: string }>>([]);
  const [metricsVisible, setMetricsVisible] = useState(false);
  const [loadingEstudo, setLoadingEstudo] = useState(false);
  const [conf, setConf] = useState<number>(randomConfianca());
  const [nivel, setNivel] = useState<{ label: string; tone: "cheio" | "estavel" | "baixo" }>(randomNivelMercado());

  // Modais
  const [alvoOpen, setAlvoOpen] = useState(false);
  const [analiseLoading, setAnaliseLoading] = useState(false);
  const [analiseOpen, setAnaliseOpen] = useState(false);
  const [aposteIsRed, setAposteIsRed] = useState<boolean>(true);
  const [aposteNumero, setAposteNumero] = useState<number>(7);

  // Entradas no Alvo form
  const [pretos, setPretos] = useState<number | "">("");
  const [vermelhos, setVermelhos] = useState<number | "">("");
  const [corVencedora, setCorVencedora] = useState<"vermelho" | "preto">("vermelho");
  const [listaAlvo, setListaAlvo] = useState<Array<{ entrada: string; forca: string; cor: string[] }>>([]);

  // Velocímetro
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sgPct, setSgPct] = useState(0.6);
  const [g1Pct, setG1Pct] = useState(0.4);

  // Alavancagem Identificada - gera horário aleatório na hora, só regenera na próxima hora
  const [alavancagemData, setAlavancagemData] = useState<{
    cores: string[];
    horario: string;
  }>(() => {
    const now = nowBrasilia();
    const currentHour = now.getHours();
    
    // Recupera do localStorage
    const savedData = localStorage.getItem('alavancagemData');
    const savedHour = localStorage.getItem('alavancagemHour');
    
    if (savedData && savedHour && Number(savedHour) === currentHour) {
      // Se é a mesma hora, usa os dados salvos
      return JSON.parse(savedData);
    }
    
    // Gera novos dados para esta hora
    const randomMin = Math.floor(Math.random() * 60);
    const horario = `${String(currentHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}`;
    
    // Sorteia cores: preto/branco OU vermelho/branco
    const coresPossiveis = [
      ["⚫", "⚪"], // preto e branco
      ["🔴", "⚪"]  // vermelho e branco
    ];
    const cores = coresPossiveis[Math.floor(Math.random() * coresPossiveis.length)];
    
    const newData = { cores, horario };
    
    // Salva no localStorage
    localStorage.setItem('alavancagemData', JSON.stringify(newData));
    localStorage.setItem('alavancagemHour', String(currentHour));
    
    return newData;
  });
  const [aguardandoEntrada, setAguardandoEntrada] = useState(false);

  // Atualiza horário a cada minuto
  useEffect(() => {
    const i = setInterval(() => setInicio(formatHM(nowBrasilia())), 30_000);
    return () => clearInterval(i);
  }, []);

  // Verificar se deve gerar nova alavancagem (nova hora) ou aguardar entrada
  useEffect(() => {
    function verificarStatusAlavancagem() {
      const now = nowBrasilia();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const savedHour = Number(localStorage.getItem('alavancagemHour') || -1);
      
      // Se mudou a hora, gera nova alavancagem
      if (currentHour !== savedHour) {
        const randomMin = Math.floor(Math.random() * 60);
        const horario = `${String(currentHour).padStart(2, '0')}:${String(randomMin).padStart(2, '0')}`;
        
        // Sorteia cores: preto/branco OU vermelho/branco
        const coresPossiveis = [
          ["⚫", "⚪"], // preto e branco
          ["🔴", "⚪"]  // vermelho e branco
        ];
        const cores = coresPossiveis[Math.floor(Math.random() * coresPossiveis.length)];
        
        const newData = { cores, horario };
        
        setAlavancagemData(newData);
        localStorage.setItem('alavancagemData', JSON.stringify(newData));
        localStorage.setItem('alavancagemHour', String(currentHour));
        setAguardandoEntrada(false);
        return;
      }
      
      // Verifica se deve mostrar "aguardando entrada"
      if (alavancagemData.horario !== "00:00") {
        const [entradaHour, entradaMinute] = alavancagemData.horario.split(':').map(Number);
        const entradaTime = entradaHour * 60 + entradaMinute;
        const currentTime = currentHour * 60 + currentMinute;
        
        // Se passou do horário, mostra aguardando
        if (currentTime > entradaTime) {
          setAguardandoEntrada(true);
        } else {
          setAguardandoEntrada(false);
        }
      }
    }

    // Verifica imediatamente
    verificarStatusAlavancagem();
    
    // Verifica a cada minuto
    const intervalId = setInterval(verificarStatusAlavancagem, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [alavancagemData.horario]);

  // Desenho do velocímetro
  function drawVelocimetro(percent: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // base
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 70, 50, Math.PI, 2 * Math.PI, false);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#2a2631";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(24,18,24,0.6)";
    ctx.stroke();
    ctx.restore();

    // indicador
    ctx.save();
    ctx.beginPath();
    ctx.arc(60, 70, 50, Math.PI, Math.PI + Math.PI * percent, false);
    ctx.lineWidth = 14;
    ctx.strokeStyle = "#ff375b";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255,55,91,0.6)";
    ctx.stroke();
    ctx.restore();

    // ponteiro
    const angle = Math.PI + Math.PI * percent;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(60, 70);
    ctx.lineTo(60 + 38 * Math.cos(angle), 70 + 38 * Math.sin(angle));
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ff375b";
    ctx.shadowBlur = 3;
    ctx.shadowColor = "#fff";
    ctx.stroke();
    ctx.restore();

    // centro
    ctx.beginPath();
    ctx.arc(60, 70, 7.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#20101d";
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#ff375b";
    ctx.stroke();
  }

  useEffect(() => {
    drawVelocimetro(sgPct);
  }, [sgPct]);

  // Integração Blaze via script UMD
  useEffect(() => {
    const w = window as any;
    const ultimos: string[] = [];
    let unsub: (() => void) | undefined;

    if (w.Blaze?.makeConnection) {
      const socket = w.Blaze.makeConnection({ type: "double" });
      const onTick = ({ color }: { color: string }) => {
        if (color === "white") return;
        ultimos.unshift(color);
        if (ultimos.length > 16) ultimos.pop();
        const reds = ultimos.filter((c) => c === "red").length;
        const blacks = ultimos.filter((c) => c === "black").length;
        const total = reds + blacks;
        if (!total) return;
        const pctRed = reds / total;
        setSgPct(pctRed);
        setG1Pct(1 - pctRed);
      };
      socket.ev.on("double.tick", onTick);
      unsub = () => socket.ev.off("double.tick", onTick);
    } else {
      // Fallback: atualiza força do sinal a cada 1 minuto (60 segundos)
      const updateForceSignal = () => {
        const v = Math.random() * 0.7 + 0.23; // Valor entre 0.23 e 0.93
        setSgPct(v);
        setG1Pct(1 - v);
        console.log(`Força do sinal atualizada: Pedra 1: ${Math.round(v * 100)}%, Pedra 2: ${Math.round((1-v) * 100)}%`);
      };
      
      // Atualiza imediatamente
      updateForceSignal();
      
      // Depois atualiza a cada 60 segundos (1 minuto)
      const i = setInterval(updateForceSignal, 60000);
      unsub = () => clearInterval(i);
    }

    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, []);

  // Gerar tabela (máx 5) com bloqueio a cada 5 minutos
  const canClickGerar = useMemo(() => {
    const lastClick = Number(localStorage.getItem("lastClickedTime") ?? 0);
    const now = nowBrasilia().getTime();
    const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutos em milissegundos
    return lastClick < fiveMinutesAgo;
  }, [inicio]);

  function gerarTabela() {
    const now = nowBrasilia();
    const lastClick = Number(localStorage.getItem("lastClickedTime") ?? 0);
    const fiveMinutesAgo = now.getTime() - (5 * 60 * 1000);
    
    if (lastClick >= fiveMinutesAgo) return;

    localStorage.setItem("lastClickedTime", String(now.getTime()));

    const qtd = 5;
    const intervalosFixos = [5, 7, 6, 8, 5, 9, 6, 7, 8, 5, 6, 9, 7, 8, 6]; // Intervalos de 5-9 minutos
    const cores = gerarSequenciaCoresAleatorias(17);

    let totalMin = now.getHours() * 60 + now.getMinutes();

    const novas: Array<{ hora: string; forca: string; cor: string }> = [];
    for (let i = 0; i < qtd; i++) {
      const h = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
      const m = String(totalMin % 60).padStart(2, "0");
      const horario = `${h}:${m}`;
      const corClasse = cores[i % cores.length];
      novas.push({ hora: horario, forca: "ENTRADA FORTE", cor: corClasse });
      totalMin += intervalosFixos[i % intervalosFixos.length];
    }
    setEntries(novas);
  }

  // Estudar Mercado -> loading -> métricas
  function estudarMercado() {
    setMetricsVisible(false);
    setLoadingEstudo(true);
    let i = 0;
    const step = setInterval(() => {
      i++;
      if (i >= 10) {
        clearInterval(step);
        setLoadingEstudo(false);
        setConf(randomConfianca());
        setNivel(randomNivelMercado());
        setMetricsVisible(true);
      }
    }, 1000);
  }

  // Análise Alavancada
  function abrirAnalise() {
    setAnaliseLoading(true);
    setAnaliseOpen(false);
    setTimeout(() => {
      // sorteio
      const isRed = Math.random() < 0.5;
      const numero = isRed ? Math.floor(Math.random() * 7) + 1 : Math.floor(Math.random() * 7) + 8;
      setAposteIsRed(isRed);
      setAposteNumero(numero);
      setAnaliseLoading(false);
      setAnaliseOpen(true);
    }, 5000);
  }

  // Entradas no Alvo
  function gerarListaAlvo() {
    if (pretos === "" || vermelhos === "") return;
    const sequencias = [
      [6, 3, 2],
      [4, 3, 4],
    ];
    const seq = sequencias[Math.floor(Math.random() * sequencias.length)];

    let now = new Date();
    let totalMin = now.getHours() * 60 + now.getMinutes();
    const lista: Array<{ entrada: string; forca: string; cor: string[] }> = [];

    for (let i = 0; i < 3; i++) {
      const hora = String(Math.floor(totalMin / 60) % 24).padStart(2, "0");
      const minuto = String(totalMin % 60).padStart(2, "0");
      const horaStr = `${hora}:${minuto}`;
      lista.push({
        entrada: horaStr,
        forca: "ENTRADA FORTE",
        cor: corVencedora === "vermelho" ? ["🟥", "⬜"] : ["⬛", "⬜"],
      });
      totalMin += seq[i];
    }
    setListaAlvo(lista);
  }

  return (
    <div className="min-h-screen">
      <header className="w-full pt-6 md:pt-10 pb-4 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">Entradas Estratégia</h1>
              <p className="mt-2 text-muted-foreground text-sm md:text-base">MODO ALAVANCAGEM</p>
            </div>
            <Button variant="glow" onClick={() => alert("Sessão encerrada.")} className="w-full sm:w-auto">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto pb-16 px-4">
        <section className="mt-6 mb-8 animate-enter">
          <Card className="card-glass">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Label htmlFor="inicio" className="text-sm font-medium">Horário Inicial</Label>
                  <Input id="inicio" value={inicio} disabled className="w-full sm:w-40" />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="hero" onClick={gerarTabela} disabled={!canClickGerar} className="w-full sm:w-auto">
                    Gerar Entradas
                  </Button>
                  <Button variant="secondary" onClick={() => setAlvoOpen(true)} className="w-full sm:w-auto">
                    Entradas no Alvo
                  </Button>
                  <Button variant="glow" onClick={abrirAnalise} className="w-full sm:w-auto">
                    Análise Alavancada
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tabela de Entradas */}
        <section className="mb-8">
          <Card className="card-glass animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Tabela de Entradas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption className="text-sm">Tabela de entradas com horários, força e cor indicativa</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Entrada</TableHead>
                      <TableHead className="text-center">Força</TableHead>
                      <TableHead className="text-center">Cor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-semibold text-center">{e.hora}</TableCell>
                        <TableCell className="font-bold text-center text-sm">{e.forca}</TableCell>
                        <TableCell className="text-lg text-center">{e.cor}</TableCell>
                      </TableRow>
                    ))}
                    {entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-8">
                          Clique em "Gerar Entradas" para criar a lista.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Força do Sinal */}
        <section className="mb-8">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-center text-lg md:text-xl">📊 Força do Sinal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Velocímetro */}
                <div className="flex flex-col items-center order-1 lg:order-1">
                  <canvas ref={canvasRef} width={120} height={76} className="mb-3 w-full max-w-[120px]" />
                  <span className="text-sm text-muted-foreground font-semibold">Medidor de Força</span>
                </div>
                
                {/* Barras de Progresso */}
                <div className="space-y-4 order-3 lg:order-2">
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-right font-bold text-primary text-sm">Pedra 1</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-500" style={{ width: `${sgPct * 100}%` }} />
                    </div>
                    <span className="text-sm font-mono w-12 text-primary">{Math.round(sgPct * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-16 text-right font-bold text-secondary text-sm">Pedra 2</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${g1Pct * 100}%` }} />
                    </div>
                    <span className="text-sm font-mono w-12 text-secondary">{Math.round(g1Pct * 100)}%</span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-center order-2 lg:order-3">
                  <div className="text-sm text-muted-foreground font-semibold mb-2">Status Atual</div>
                  <div className={`text-base md:text-lg font-bold ${sgPct > g1Pct ? 'text-primary' : 'text-secondary'}`}>
                    {sgPct > g1Pct ? 'Pedra 1 Dominante' : 'Pedra 2 Dominante'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Diferença: {Math.round(Math.max(sgPct, g1Pct) * 100 - Math.min(sgPct, g1Pct) * 100)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alavancagem Identificada e Análise de Mercado lado a lado */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alavancagem Identificada */}
          <Card className="card-glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-primary text-lg md:text-xl">ALAVANCAGEM IDENTIFICADA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4 p-2 md:p-4">
                {aguardandoEntrada ? (
                  <div className="text-center animate-pulse">
                    <div className="text-muted-foreground font-semibold mb-2 text-sm md:text-base">
                      ⏳ Aguardando entrada...
                    </div>
                    <div className="flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 32 32" className="animate-spin">
                        <circle cx="16" cy="16" r="12" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray="18 45">
                          <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="1s" repeatCount="indefinite" />
                        </circle>
                      </svg>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      {alavancagemData.cores.map((cor, idx) => (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                            cor === "🔴" ? "bg-primary border-primary" : 
                            cor === "⚫" ? "bg-card text-card-foreground border-muted-foreground" : 
                            "bg-card-foreground text-card border-muted-foreground"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
                      <span className="font-mono text-xl font-bold text-primary">{alavancagemData.horario}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Análise de Mercado */}
          <Card className="card-glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-center text-primary text-lg md:text-xl">🧠 ANÁLISE DE MERCADO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4 p-2 md:p-4">
                {!loadingEstudo && !metricsVisible && (
                  <Button variant="glow" size="lg" onClick={estudarMercado} className="w-full max-w-xs">
                    📊 Estudar Mercado
                  </Button>
                )}

                {loadingEstudo && (
                  <div className="space-y-3 w-full max-w-xs">
                    <div className="font-semibold text-primary text-center text-sm md:text-base">Analisando a Blaze...</div>
                    <Progress value={0} />
                    {/* Fake barra animada */}
                    <div className="w-full h-4 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary animate-[progress_10s_linear_forwards]" style={{ width: "100%" }} />
                    </div>
                  </div>
                )}

                {metricsVisible && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Card className="card-glass">
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-muted-foreground font-semibold mb-1">Confiança</div>
                        <div className="text-xl md:text-2xl font-black">{conf}%</div>
                      </CardContent>
                    </Card>
                    <Card className="card-glass">
                      <CardContent className="pt-4 text-center">
                        <div className="text-sm text-muted-foreground font-semibold mb-1">Nível do Mercado</div>
                        <div className={`text-xl md:text-2xl font-black ${toneClass[nivel.tone]}`}>{nivel.label}</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Modal Entradas no Alvo */}
      <Dialog open={alvoOpen} onOpenChange={setAlvoOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Entradas no Alvo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label className="text-sm font-medium">Número de Pretos</Label>
              <Input type="number" min={1} max={10} value={pretos as any} onChange={(e) => setPretos(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="grid gap-3">
              <Label className="text-sm font-medium">Número de Vermelhos</Label>
              <Input type="number" min={1} max={10} value={vermelhos as any} onChange={(e) => setVermelhos(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="grid gap-3">
              <Label className="text-sm font-medium">Cor Vencedora</Label>
              <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={corVencedora} onChange={(e) => setCorVencedora(e.target.value as any)}>
                <option value="vermelho">Vermelho</option>
                <option value="preto">Preto</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAlvoOpen(false)} className="w-full sm:w-auto">Fechar</Button>
              <Button variant="hero" onClick={gerarListaAlvo} className="w-full sm:w-auto">Gerar Lista</Button>
            </div>
            {listaAlvo.length > 0 && (
              <div className="mt-2">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Entrada</TableHead>
                        <TableHead className="text-center">Força</TableHead>
                        <TableHead className="text-center">Cor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listaAlvo.map((i, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-center">{i.entrada}</TableCell>
                          <TableCell className="font-semibold text-center text-sm">{i.forca}</TableCell>
                          <TableCell className="text-lg text-center">{i.cor.join("")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Análise Alavancada */}
      <Dialog open={analiseLoading}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-secondary">Analisando o Mercado...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <svg width="54" height="54" viewBox="0 0 54 54" aria-label="Carregando">
              <circle cx="27" cy="27" r="22" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" strokeLinecap="round" strokeDasharray="34 80">
                <animateTransform attributeName="transform" type="rotate" from="0 27 27" to="360 27 27" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resultado Análise Alavancada */}
      <Dialog open={analiseOpen} onOpenChange={setAnaliseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">💸 Análise Alavancada</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="card-glass">
              <CardContent className="pt-4 text-center">
                <div className="text-sm text-muted-foreground font-semibold mb-1">GALES</div>
                <div className="text-xl">--</div>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="pt-4 text-center">
                <div className="text-sm text-muted-foreground font-semibold mb-1">APOSTE APÓS</div>
                <div className="flex flex-col items-center gap-2 mt-1">
                  <span className={`inline-flex w-7 h-7 rounded-full border-2 border-border shadow`} style={{ background: aposteIsRed ? "#ff375b" : "#18191a" }} />
                  <div className="text-xl md:text-2xl font-black text-secondary">{aposteNumero}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
