import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Feather,
  Menu,
  Moon,
  NotebookPen,
  Pause,
  Play,
  Search,
  Settings2,
  Shuffle,
  Sun,
  Tags,
  TextCursorInput,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { chapterOrder, poems, type Poem } from "@/data/shijing";
import { prefaces } from "@/data/prefaces";
import {
  poemMatchesTopic,
  topicByKey,
  topicCount,
  topicDefinitions,
  topicGroups,
  topicMethodNote,
  topicsForPoem,
  type TopicKey,
} from "@/data/topics";

const HERO = `${import.meta.env.BASE_URL}assets/shijing-hero.webp`;
const REEDS = `${import.meta.env.BASE_URL}assets/shijing-reeds.png`;
const NOTE_KEY = "shijing-reader:notes:v1";
const STAR_KEY = "shijing-reader:stars:v1";
const SIZE_KEY = "shijing-reader:font-size:v1";

type Tab = "text" | "preface" | "notes";
type Direction = "horizontal" | "vertical";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function initialPoemId() {
  const match = window.location.hash.match(/^#poem-(\d+)$/);
  const id = match ? Number(match[1]) : 1;
  return id >= 1 && id <= poems.length ? id : 1;
}

function poemUrl(poem: Poem) {
  return `https://zh.wikisource.org/zh-hant/${encodeURIComponent(`詩經/${poem.title}`)}`;
}

function groupPoems(items: Poem[]) {
  return chapterOrder.map((chapter) => ({
    chapter,
    sections: Array.from(
      items
        .filter((poem) => poem.chapter === chapter)
        .reduce((map, poem) => {
          const current = map.get(poem.section) ?? [];
          current.push(poem);
          map.set(poem.section, current);
          return map;
        }, new Map<string, Poem[]>()),
    ).map(([section, list]) => ({ section, poems: list })),
  }));
}

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [cover, setCover] = useState(
    () =>
      new URLSearchParams(window.location.search).get("read") !== "1" &&
      !window.location.hash,
  );
  const [poemId, setPoemId] = useState(initialPoemId);
  const [tab, setTab] = useState<Tab>("text");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState(false);
  const [about, setAbout] = useState(false);
  const [settings, setSettings] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>([]);
  const [favorites, setFavorites] = useState<number[]>(() =>
    readJson<number[]>(STAR_KEY, []),
  );
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    readJson<Record<number, string>>(NOTE_KEY, {}),
  );
  const [fontSize, setFontSize] = useState(() =>
    Number(localStorage.getItem(SIZE_KEY)) || 24,
  );
  const [direction, setDirection] = useState<Direction>("horizontal");
  const [speaking, setSpeaking] = useState(false);
  const poemTop = useRef<HTMLElement>(null);

  const current = poems[poemId - 1];
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-Hant");
    return poems.filter((poem) => {
      const matchFavorite = !favoritesOnly || favorites.includes(poem.id);
      const matchTopics = topicGroups.every((group) => {
        const selectedInGroup = selectedTopics.filter(
          (key) => topicByKey[key].group === group.key,
        );
        return (
          selectedInGroup.length === 0 ||
          selectedInGroup.some((key) => poemMatchesTopic(poem, key))
        );
      });
      const haystack = `${poem.title}${poem.chapter}${poem.section}${poem.stanzas.join("")}`.toLocaleLowerCase("zh-Hant");
      return matchFavorite && matchTopics && (!needle || haystack.includes(needle));
    });
  }, [query, favoritesOnly, favorites, selectedTopics]);
  const grouped = useMemo(() => groupPoems(filtered), [filtered]);
  const topicCounts = useMemo(
    () =>
      Object.fromEntries(
        topicDefinitions.map((topic) => [topic.key, topicCount(topic.key, poems)]),
      ) as Record<TopicKey, number>,
    [],
  );

  useEffect(() => {
    localStorage.setItem(STAR_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(SIZE_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    const onHash = () => {
      const id = initialPoemId();
      setPoemId(id);
      setCover(false);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowLeft" && poemId > 1) selectPoem(poemId - 1);
      if (event.key === "ArrowRight" && poemId < poems.length)
        selectPoem(poemId + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [poemId]);

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  function selectPoem(id: number) {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPoemId(id);
    setTab("text");
    setDrawer(false);
    setCover(false);
    window.history.replaceState(null, "", `#poem-${id}`);
    requestAnimationFrame(() => poemTop.current?.scrollIntoView({ behavior: "smooth" }));
  }

  function startReading() {
    setCover(false);
    window.history.replaceState(null, "", `?read=1#poem-${poemId}`);
  }

  function toggleFavorite() {
    const has = favorites.includes(current.id);
    setFavorites((items) =>
      has ? items.filter((id) => id !== current.id) : [...items, current.id],
    );
    toast(has ? "已移出收藏" : `已收藏〈${current.title}〉`);
  }

  function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?read=1#poem-${current.id}`;
    navigator.clipboard.writeText(url).then(() => toast("篇章連結已複製"));
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) {
      toast.error("此瀏覽器不支援語音朗讀");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const lines = current.stanzas.flatMap((stanza) =>
      stanza.split(/(?<=[。！？；])/).filter(Boolean),
    );
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((item) => /zh[-_](TW|Hant)/i.test(item.lang)) ??
      voices.find((item) => /^zh/i.test(item.lang));
    let cursor = 0;
    window.speechSynthesis.cancel();
    setSpeaking(true);
    const speakNext = () => {
      if (cursor >= lines.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(lines[cursor++]);
      utterance.lang = "zh-TW";
      utterance.rate = 0.82;
      if (voice) utterance.voice = voice;
      utterance.onend = speakNext;
      utterance.onerror = () => {
        setSpeaking(false);
        toast.error("朗讀中止，請檢查系統中文語音設定");
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }

  function randomPoem() {
    let next = poemId;
    while (next === poemId) next = Math.floor(Math.random() * poems.length) + 1;
    selectPoem(next);
  }

  function toggleTopic(topic: TopicKey) {
    setSelectedTopics((currentTopics) =>
      currentTopics.includes(topic)
        ? currentTopics.filter((key) => key !== topic)
        : [...currentTopics, topic],
    );
  }

  const currentIndex = current.id - 1;
  const isFavorite = favorites.includes(current.id);
  const preface = prefaces[current.id];
  const currentTopics = topicsForPoem(current);

  if (cover) {
    return (
      <main className="cover" style={{ backgroundImage: `url(${HERO})` }}>
        <header className="coverNav">
          <button className="brand" onClick={() => setCover(true)} aria-label="詩經首頁">
            <span className="brandSeal">詩</span>
            <span>詩經讀本</span>
          </button>
          <div className="coverActions">
            <button className="textButton" onClick={() => setAbout(true)}>
              版本與來源
            </button>
            <button className="iconButton" onClick={toggleTheme} aria-label="切換明暗">
              {theme === "light" ? <Moon /> : <Sun />}
            </button>
          </div>
        </header>

        <section className="coverContent">
          <div className="eyebrow"><span />先秦詩歌總集 · 風雅頌</div>
          <h1>詩經</h1>
          <p className="coverSubtitle">詩三百，一言以蔽之，思無邪。</p>
          <p className="coverIntro">
            三百零五篇，分國風、二雅、三頌。從草木鳥獸到婚戀征役，
            以古老的聲音，照見人情與禮樂的源流。
          </p>
          <div className="coverCtas">
            <button className="primaryCta" onClick={startReading}>
              <BookOpen /> 開始閱讀 <ArrowRight />
            </button>
            <button className="secondaryCta" onClick={randomPoem}>
              <Shuffle /> 隨機一篇
            </button>
          </div>
          <div className="coverStats" aria-label="讀本統計">
            <div><b>305</b><span>今存詩篇</span></div>
            <div><b>15</b><span>國風地域</span></div>
            <div><b>6</b><span>風雅頌分部</span></div>
            <div><b>3,000+</b><span>年詩歌源流</span></div>
          </div>
        </section>

        <div className="coverQuote" aria-hidden="true">
          <span>關關雎鳩</span><span>在河之洲</span>
        </div>
        <div className="coverEdition">甲辰編次 · 數位校讀版 v1.0</div>
        {about && <AboutPanel onClose={() => setAbout(false)} />}
      </main>
    );
  }

  return (
    <div className="readerShell">
      <header className="readerHeader">
        <div className="readerHeaderLeft">
          <button className="mobileMenu iconButton" onClick={() => setDrawer(true)} aria-label="開啟目錄">
            <Menu />
          </button>
          <button className="brand compact" onClick={() => setCover(true)}>
            <span className="brandSeal">詩</span><span>詩經讀本</span>
          </button>
          <span className="headerDivider" />
          <span className="headerLocation">{current.chapter} · {current.section}</span>
        </div>
        <div className="readerActions">
          <button className="iconButton" onClick={randomPoem} aria-label="隨機一篇"><Shuffle /></button>
          <button className="iconButton" onClick={copyLink} aria-label="複製連結"><Copy /></button>
          <button className="iconButton" onClick={toggleFavorite} aria-label="收藏篇章">
            <Bookmark className={isFavorite ? "filled" : ""} />
          </button>
          <button className="iconButton" onClick={() => setSettings(!settings)} aria-label="閱讀設定"><Settings2 /></button>
          <button className="iconButton" onClick={toggleTheme} aria-label="切換明暗">
            {theme === "light" ? <Moon /> : <Sun />}
          </button>
          <button className="iconButton" onClick={() => setAbout(true)} aria-label="版本與來源"><CircleHelp /></button>
        </div>
      </header>

      <div className="readerGrid">
        <aside className={`catalogue ${drawer ? "open" : ""}`}>
          <Catalogue
            grouped={grouped}
            currentId={current.id}
            query={query}
            setQuery={setQuery}
            favoritesOnly={favoritesOnly}
            setFavoritesOnly={setFavoritesOnly}
            favoritesCount={favorites.length}
            selectedTopics={selectedTopics}
            toggleTopic={toggleTopic}
            clearTopics={() => setSelectedTopics([])}
            topicCounts={topicCounts}
            selectPoem={selectPoem}
            close={() => setDrawer(false)}
          />
        </aside>
        {drawer && <button className="scrim" onClick={() => setDrawer(false)} aria-label="關閉目錄" />}

        <main className="readingPane" ref={poemTop}>
          {settings && (
            <div className="settingsPopover">
              <div><span>正文字級</span><b>{fontSize}px</b></div>
              <input
                aria-label="正文字級"
                type="range"
                min="18"
                max="34"
                value={fontSize}
                onChange={(event) => setFontSize(Number(event.target.value))}
              />
              <div className="directionButtons">
                <button className={direction === "horizontal" ? "active" : ""} onClick={() => setDirection("horizontal")}>橫排</button>
                <button className={direction === "vertical" ? "active" : ""} onClick={() => setDirection("vertical")}>直排</button>
              </div>
            </div>
          )}

          <article className="poemArticle">
            <div className="breadcrumb">
              <span>{current.chapter}</span><i>／</i><span>{current.section}</span><i>／</i><span>第 {current.id} 篇</span>
            </div>
            <div className="poemHeading">
              <div>
                <div className="titleKicker">{String(current.id).padStart(3, "0")}</div>
                <h1>{current.title}</h1>
              </div>
              <button className={`listenButton ${speaking ? "playing" : ""}`} onClick={toggleSpeech}>
                {speaking ? <Pause /> : <Play />}
                <span>{speaking ? "停止朗讀" : "聽此篇"}</span>
              </button>
            </div>

            <div className="poemTopicRow" aria-label="本篇主題">
              <span><Tags /> 本篇主題</span>
              {currentTopics.map((topic) => (
                <button
                  key={topic.key}
                  className={selectedTopics.includes(topic.key) ? "active" : ""}
                  onClick={() => toggleTopic(topic.key)}
                  title={`${topic.description}；點按以篩選目錄`}
                  aria-pressed={selectedTopics.includes(topic.key)}
                >
                  {topic.label}
                </button>
              ))}
            </div>

            <nav className="contentTabs" aria-label="內容層次">
              <button className={tab === "text" ? "active" : ""} onClick={() => setTab("text")}>
                <Feather /> 原文
              </button>
              <button className={tab === "preface" ? "active" : ""} onClick={() => setTab("preface")}>
                <TextCursorInput /> 毛詩序
              </button>
              <button className={tab === "notes" ? "active" : ""} onClick={() => setTab("notes")}>
                <NotebookPen /> 我的札記
                {notes[current.id] && <span className="noteDot" />}
              </button>
            </nav>

            <section className="contentStage">
              {tab === "text" && (
                <div
                  className={`poemText ${direction}`}
                  style={{ "--poem-size": `${fontSize}px` } as React.CSSProperties}
                >
                  {current.stanzas.map((stanza, index) => (
                    <p key={index}>{stanza}</p>
                  ))}
                </div>
              )}

              {tab === "preface" && (
                <div className="prefacePane">
                  {preface ? (
                    <>
                      <span className="sourceTag">古序 · 已核對</span>
                      <blockquote>{preface.preface}</blockquote>
                      <a href={poemUrl(current)} target="_blank" rel="noreferrer">
                        查閱中文維基文庫原頁 <ArrowRight />
                      </a>
                    </>
                  ) : (
                    <div className="emptyEditorial">
                      <Feather />
                      <h2>此篇古序尚待校訂</h2>
                      <p>本站不以自動生成文字代替古籍校勘。可先查閱原始頁面，再依內容指南加入具來源的文本。</p>
                      <a href={poemUrl(current)} target="_blank" rel="noreferrer">前往維基文庫核對 <ArrowRight /></a>
                    </div>
                  )}
                </div>
              )}

              {tab === "notes" && (
                <div className="notesPane">
                  <div className="notesIntro">
                    <div><h2>讀詩札記</h2><p>只保存在這部裝置的瀏覽器，不會上傳。</p></div>
                    <Check />
                  </div>
                  <textarea
                    value={notes[current.id] ?? ""}
                    onChange={(event) => setNotes((all) => ({ ...all, [current.id]: event.target.value }))}
                    placeholder={`記下你讀〈${current.title}〉時想到的字義、聲韻與感受……`}
                  />
                  <div className="saveHint">自動儲存 · {notes[current.id]?.length ?? 0} 字</div>
                </div>
              )}
            </section>

            <div className="poemMeta">
              <div><span>分部</span><b>{current.chapter}</b></div>
              <div><span>篇次</span><b>{current.id} / 305</b></div>
              <div><span>分章</span><b>{current.stanzas.length} 章</b></div>
              <div><span>字數</span><b>{current.stanzas.join("").replace(/[，。！？；、\s]/g, "").length} 字</b></div>
            </div>

            <nav className="poemPager" aria-label="前後篇導航">
              <button disabled={currentIndex === 0} onClick={() => selectPoem(current.id - 1)}>
                <ArrowLeft />
                <span><small>上一篇</small><b>{poems[currentIndex - 1]?.title ?? "卷首"}</b></span>
              </button>
              <span className="pagerMark">詩<br />三<br />百</span>
              <button disabled={currentIndex === poems.length - 1} onClick={() => selectPoem(current.id + 1)}>
                <span><small>下一篇</small><b>{poems[currentIndex + 1]?.title ?? "卷末"}</b></span>
                <ArrowRight />
              </button>
            </nav>

            <footer className="readerFooter">
              <img src={REEDS} alt="" />
              <p>原始結構化語料：chinese-poetry（MIT）<br />篇目分類交叉核對：中文維基文庫</p>
            </footer>
          </article>
        </main>
      </div>

      {about && <AboutPanel onClose={() => setAbout(false)} />}
    </div>
  );
}

function Catalogue({
  grouped,
  currentId,
  query,
  setQuery,
  favoritesOnly,
  setFavoritesOnly,
  favoritesCount,
  selectedTopics,
  toggleTopic,
  clearTopics,
  topicCounts,
  selectPoem,
  close,
}: {
  grouped: ReturnType<typeof groupPoems>;
  currentId: number;
  query: string;
  setQuery: (value: string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (value: boolean) => void;
  favoritesCount: number;
  selectedTopics: TopicKey[];
  toggleTopic: (topic: TopicKey) => void;
  clearTopics: () => void;
  topicCounts: Record<TopicKey, number>;
  selectPoem: (id: number) => void;
  close: () => void;
}) {
  const [topicsOpen, setTopicsOpen] = useState(true);
  const resultCount = grouped.reduce(
    (total, group) => total + group.sections.reduce((sum, section) => sum + section.poems.length, 0),
    0,
  );
  return (
    <div className="catalogueInner">
      <div className="catalogueTitle">
        <div><span>BOOK OF ODES</span><h2>篇章目錄</h2></div>
        <button className="drawerClose" onClick={close} aria-label="關閉目錄"><X /></button>
      </div>
      <label className="searchBox">
        <Search />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋篇名或全文" />
        {query && <button onClick={() => setQuery("")} aria-label="清除搜尋"><X /></button>}
      </label>
      <div className="catalogueFilters">
        <button className={!favoritesOnly ? "active" : ""} onClick={() => setFavoritesOnly(false)}>全部 <b>{poems.length}</b></button>
        <button className={favoritesOnly ? "active" : ""} onClick={() => setFavoritesOnly(true)}>收藏 <b>{favoritesCount}</b></button>
      </div>
      <section className={`topicFilters ${topicsOpen ? "open" : ""}`} aria-label="依主題分類篩選">
        <div className="topicFilterHeading">
          <button
            className="topicFilterToggle"
            onClick={() => setTopicsOpen((open) => !open)}
            aria-expanded={topicsOpen}
          >
            <span><Tags /> 主題索引</span>
            {selectedTopics.length > 0 && <b>{selectedTopics.length}</b>}
            <ChevronDown />
          </button>
          {selectedTopics.length > 0 && (
            <button className="clearTopics" onClick={clearTopics}>清除</button>
          )}
        </div>
        {topicsOpen && (
          <div className="topicFilterBody">
            {topicGroups.map((group) => (
              <div className="topicGroup" key={group.key}>
                <div className="topicGroupLabel">
                  <span>{group.label}</span>
                  <small>{group.description}</small>
                </div>
                <div className="topicChips">
                  {topicDefinitions
                    .filter((topic) => topic.group === group.key)
                    .map((topic) => {
                      const active = selectedTopics.includes(topic.key);
                      return (
                        <button
                          key={topic.key}
                          className={active ? "active" : ""}
                          onClick={() => toggleTopic(topic.key)}
                          aria-pressed={active}
                          title={topic.description}
                        >
                          {active && <Check />}
                          <span>{topic.label}</span>
                          <b>{topicCounts[topic.key]}</b>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
            <p className="topicHint"><CircleHelp />同組任一、跨組交集。{topicMethodNote}</p>
          </div>
        )}
      </section>
      <div className="catalogueCount">目前顯示 {resultCount} 篇</div>
      <div className="catalogueScroll">
        {resultCount === 0 && <div className="noResults">沒有符合的篇章</div>}
        {grouped.map((group) =>
          group.sections.length ? (
            <details key={group.chapter} open>
              <summary><span>{group.chapter}</span><small>{group.sections.reduce((n, s) => n + s.poems.length, 0)} 篇</small><ChevronDown /></summary>
              {group.sections.map((section) => (
                <div className="sectionGroup" key={`${group.chapter}-${section.section}`}>
                  <h3>{section.section}</h3>
                  {section.poems.map((poem) => (
                    <button key={poem.id} className={poem.id === currentId ? "active" : ""} onClick={() => selectPoem(poem.id)}>
                      <span>{String(poem.id).padStart(3, "0")}</span>{poem.title}
                    </button>
                  ))}
                </div>
              ))}
            </details>
          ) : null,
        )}
      </div>
    </div>
  );
}

function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="modalLayer" role="dialog" aria-modal="true" aria-label="版本與來源">
      <button className="modalScrim" onClick={onClose} aria-label="關閉" />
      <section className="aboutPanel">
        <button className="aboutClose iconButton" onClick={onClose}><X /></button>
        <span className="aboutKicker">ABOUT THIS EDITION</span>
        <h2>版本與來源</h2>
        <p className="aboutLead">以可維護資料層重建的《詩經》互動讀本；借鑑參考站的閱讀架構，程式與視覺皆為獨立實作。</p>
        <div className="aboutRule" />
        <h3>語料</h3>
        <p>收錄今存三百零五篇。原始結構化資料來自 chinese-poetry 專案（MIT License），經 OpenCC 轉為繁體；篇目與風、雅、頌分類以中文維基文庫交叉核對。古籍用字與異文仍應以權威校勘本為準。</p>
        <h3>內容分層</h3>
        <p>「原文」與「毛詩序」分開保存；只有已核對的古序才顯示正文，未完成者明確標示待校訂。「我的札記」僅存於使用者瀏覽器。</p>
        <h3>編輯方式</h3>
        <p>每篇均為獨立資料物件，包含篇次、篇名、分部、次分部與分章陣列。編輯資料不需更動介面程式，並附有完整 <code>CONTENT_GUIDE.md</code>。</p>
        <div className="sourceLinks">
          <a href="https://github.com/chinese-poetry/chinese-poetry/tree/master/%E8%AF%97%E7%BB%8F" target="_blank" rel="noreferrer">結構化語料 <ArrowRight /></a>
          <a href="https://zh.wikisource.org/zh-hant/%E8%A9%A9%E7%B6%93" target="_blank" rel="noreferrer">維基文庫底本 <ArrowRight /></a>
        </div>
      </section>
    </div>
  );
}
