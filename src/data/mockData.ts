import {
  Book,
  DailyTask,
  ExerciseLog,
  SpeedTestArticle,
  UserProfile,
} from "@/types";
import { countWordsInParagraphs } from "@/lib/textUtils";

export const INITIAL_USER_PROFILE: UserProfile = {
  id: "user-1",
  name: "Ceylan Al",
  email: "ceylan@superead.app",
  current_wpm: 340,
  baseline_wpm: 215,
  comprehension_rate: 85,
  streak_days: 7,
  created_at: "2026-10-15T10:00:00.000Z",
};

export const INITIAL_DAILY_TASKS: DailyTask[] = [
  {
    id: "task-schulte",
    title: "1x Schulte Tablosu (5x5)",
    subtitle: "Çevresel görüş ve görsel tarama refleksini ısıt",
    exercise_type: "schulte",
    target_href: "/drills?tab=schulte",
    duration_label: "2 dk",
    completed: true,
  },
  {
    id: "task-rsvp",
    title: "1x RSVP Odak Antrenmanı",
    subtitle: "İç seslendirmeyi (subvocalization) kırmak için 400 WPM akış",
    exercise_type: "rsvp",
    target_href: "/drills?tab=rsvp",
    duration_label: "3 dk",
    completed: false,
  },
  {
    id: "task-pacer",
    title: "1x Magic Pacer Blok Okuma",
    subtitle: "Geriye dönüşleri (regression) önleyen satır takip egzersizi",
    exercise_type: "pacer",
    target_href: "/drills?tab=pacer",
    duration_label: "4 dk",
    completed: false,
  },
  {
    id: "task-book",
    title: "10 dk Serbest E-Kitap Okuma",
    subtitle: "Kütüphaneden bir eseri Smart Reader ile oku",
    exercise_type: "book_reading",
    target_href: "/library",
    duration_label: "10 dk",
    completed: false,
  },
];

export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [
  {
    id: "log-1",
    user_id: "user-1",
    exercise_type: "speed_test",
    achieved_wpm: 215,
    accuracy_score: 75,
    duration_seconds: 95,
    completed_at: "2026-10-21T09:30:00.000Z",
    label: "Pzt",
  },
  {
    id: "log-2",
    user_id: "user-1",
    exercise_type: "rsvp",
    achieved_wpm: 250,
    accuracy_score: 80,
    duration_seconds: 120,
    completed_at: "2026-10-22T14:15:00.000Z",
    label: "Sal",
  },
  {
    id: "log-3",
    user_id: "user-1",
    exercise_type: "pacer",
    achieved_wpm: 275,
    accuracy_score: 82,
    duration_seconds: 150,
    completed_at: "2026-10-23T18:00:00.000Z",
    label: "Çar",
  },
  {
    id: "log-4",
    user_id: "user-1",
    exercise_type: "schulte",
    achieved_wpm: 290,
    accuracy_score: 92,
    duration_seconds: 24,
    completed_at: "2026-10-24T11:20:00.000Z",
    label: "Per",
  },
  {
    id: "log-5",
    user_id: "user-1",
    exercise_type: "speed_test",
    achieved_wpm: 310,
    accuracy_score: 75,
    duration_seconds: 68,
    completed_at: "2026-10-25T16:45:00.000Z",
    label: "Cum",
  },
  {
    id: "log-6",
    user_id: "user-1",
    exercise_type: "rsvp",
    achieved_wpm: 330,
    accuracy_score: 88,
    duration_seconds: 110,
    completed_at: "2026-10-26T20:10:00.000Z",
    label: "Cmt",
  },
  {
    id: "log-7",
    user_id: "user-1",
    exercise_type: "speed_test",
    achieved_wpm: 340,
    accuracy_score: 85,
    duration_seconds: 62,
    completed_at: "2026-10-27T00:30:00.000Z",
    label: "Paz",
  },
];

const speedTest1Paragraphs = [
  "İnsan beyni, yazılı sembolleri anlamlı düşüncelere dönüştürme konusunda olağanüstü bir adaptasyon yeteneğine sahiptir. Ancak çoğumuz okumayı ilkokul yıllarında harfleri ve heceleri yüksek sesle birleştirerek öğrendiğimiz için, yetişkinlikte bile 'iç seslendirme' (subvocalization) adı verilen alışkanlığı sürdürürüz. İç seslendirme, gözümüzün gördüğü her kelimeyi zihnimizin içinde sessizce telaffuz etmemiz anlamına gelir. Ortalama bir insanın konuşma hızı dakikada 150 ila 250 kelime arasında sınırlı olduğundan, iç seslendirme alışkanlığı okuma hızımızı da doğal olarak bu dar bantta tutar.",
  "Oysa görsel korteksimiz, işitsel merkezimizden çok daha hızlı veri işleyebilir. Gözlerimiz bir satır üzerinde kayarken aslında kesintisiz ve düz bir çizgi izlemez; bunun yerine 'sakkad' adı verilen küçük sıçramalar yapar ve 'fiksasyon' denilen kısa odaklanma anlarında kelimelerin fotoğrafını çeker. Eğitimsiz bir okuyucu her kelimede, hatta bazen uzun kelimelerin hecelerinde ayrı ayrı duraksar. Üstelik dikkat dağıldığında veya cümle yapısı karmaşıklaştığında, göz istemsizce önceki kelimelere geri döner. 'Regresyon' adı verilen bu geriye dönüşler, toplam okuma süresinin yaklaşık yüzde yirmi beşini boşa harcar.",
  "Hızlı okuma ve görsel algı antrenmanları, tam olarak bu iki temel darboğazı aşmak üzerine kuruludur. İlk adım, bir rehber veya vurgulayıcı (pacer) yardımıyla gözün satır üzerindeki ritmini sabitleyerek geriye dönüşleri engellemektir. İkinci adım ise merkezi odak noktasını korurken çevresel görüş (periferik algı) alanını genişletmektir. Çevresel görüş güçlendiğinde, göz tek bir noktaya odaklandığında bile sağdaki ve soldaki ikişer-üçer kelimelik grupları tek bir anlam bloğu olarak kavrayabilir.",
  "Bilimsel araştırmalar, kelime-kelime okumak yerine anlam bloklarıyla okumanın yalnızca hızı artırmakla kalmayıp, çalışma belleğindeki (working memory) bilişsel yükü de azalttığını göstermektedir. Beyin tek tek kelimeleri birleştirmekle uğraşmak yerine doğrudan cümlenin ana fikrine ve kavramlar arası ilişkilere odaklanır. Düzenli yapılan günde on beş dakikalık nöro-görsel egzersizler, birkaç hafta içinde anlama oranından ödün vermeden okuma hızını iki katına çıkarabilmektedir."
];

const speedTest2Paragraphs = [
  "Dijital çağda insan zihninin en kıt ve en değerli kaynağı bilgiden ziyade dikkattir. Her gün binlerce bildirim, kısa video akışı ve parçalı metinle kuşatılan modern birey, 'sürekli kısmi dikkat' adı verilen bilişsel bir yorgunluk durumuyla karşı karşıyadır. Beynimizin prefrontal korteksi, bir görevden diğerine her geçiş yaptığında 'bilişsel geçiş maliyeti' öder. Bir makaleyi okurken telefona gelen tek bir bildirime göz atmak sadece birkaç saniye sürse de, zihnin önceki derin odaklanma seviyesine geri dönmesi ortalama yirmi üç dakika alabilmektedir.",
  "Nörobilimci Cal Newport'un 'Derin Çalışma' (Deep Work) olarak tanımladığı kavram, dikkat dağıtıcı unsurlardan arındırılmış bir ortamda bilişsel kapasitenin sınırlarını zorlayacak düzeyde odaklanma becerisidir. Derin okuma ve derin çalışma sırasında beyindeki ilgili nöron devreleri tekrar tekrar ateşlenir. Bu yoğun ateşlenme, nöronların etrafını saran 'miyelin' kılıfının kalınlaşmasını sağlar. Miyelin kılıfı ne kadar kalınsa, elektriksel sinyaller nöronlar arasında o kadar hızlı ve kayıpsız iletilir; yani karmaşık kavramları anlama ve sentezleme hızımız doğrudan artar.",
  "İlginç bir şekilde, okuma hızının çok düşük olması da odaklanmayı bozan temel faktörlerden biridir. İnsan zihni dakikada ortalama dört yüz kelimelik düşünce üretebilirken, dakikada yüz seksen kelimeyle okuyan bir kişinin beyninde büyük bir 'dikkat boşluğu' oluşur. Kullanılmayan bu bilişsel kapasite, zihnin başka düşüncelere, günlük kaygılara veya çevredeki uyaranlara kaymasına neden olur.",
  "Okuma temposunu beynin doğal bilgi işleme hızına yaklaştırmak, zihni metnin içinde tutan güçlü bir akış (flow) hali yaratır. Görev zorluğu ile beceri seviyesi dengelendiğinde devreye giren bu akış halinde zaman algısı değişir, içsel çaba azalır ve okunan metin uzun süreli belleğe çok daha kalıcı biçimde kodlanır. Dolayısıyla hızlı ve odaklı okuma, yalnızca zaman kazandıran mekanik bir teknik değil, aynı zamanda zihinsel berraklığı koruyan modern bir savunma mekanizmasıdır."
];

const speedTest3Paragraphs = [
  "Bilim tarihinde paradigmaları değiştiren en büyük sıçramalar, genellikle birbirinden tamamen bağımsız görünen disiplinlerin kesişim noktalarında meydana gelmiştir. Rönesans döneminin polimatları, sanatı anatomiyle, matematiği perspektifle ve felsefeyi doğa gözlemleriyle birleştirerek yeni düşünce modelleri inşa etmişlerdir. Günümüzde ise aşırı uzmanlaşma eğilimi, araştırmacıları kendi dar alanlarında derinleşmeye iterken büyük resmi görme yetisini zaman zaman zayıflatabilmektedir.",
  "Bilişsel psikolojide 'zihinsel modeller' (mental models) olarak adlandırılan yapılar, dış dünyanın nasıl işlediğine dair zihnimizde kurduğumuz kavramsal çerçevelerdir. Yalnızca tek bir disiplinin kavramlarıyla düşünen bir zihin, karşılaştığı her problemi aynı araçla çözmeye çalışır. Oysa fizikteki entropi yasasını, biyolojideki evrimsel seçilimi, ekonomideki fırsat maliyetini ve mühendislikteki geri besleme döngülerini bir arada bilen bir okuyucu, karmaşık sorunları çok boyutlu bir mercekten analiz edebilir.",
  "Geniş kapsamlı ve disiplinlerarası bir okuma alışkanlığı geliştirmek, beyinde 'uzak çağrışım ağları' kurmanın en etkili yoludur. Farklı konularda okunan her yeni kitap, mevcut bilgi ağımıza yeni düğümler ekler. Yaratıcılık dediğimiz olgu, çoğu zaman yoktan bir şey var etmek değil, zihinde daha önce birbiriyle temas etmemiş iki farklı bilgi düğümü arasında beklenmedik bir köprü kurmaktır.",
  "Bu nedenle stratejik okuma, her metni aynı hızda ve aynı yöntemle tüketmek anlamına gelmez. Bir referans kitabını tararken seçici hız (skimming ve RSVP), felsefi veya teknik bir metni incelerken ise analitik ve not alarak okuma (Magic Pacer ve aktif sorgulama) devreye girmelidir. Okuyucu, metnin amacına göre vites değiştirebilen esnek bir bilişsel mimariye sahip olduğunda, bilgi yığınları arasında kaybolmak yerine onları bilgeliğe dönüştürebilir."
];

export const SPEED_TEST_ARTICLES: SpeedTestArticle[] = [
  {
    id: "st-neuro-reading",
    title: "Beynin Okuma Mimarisi ve Görsel Algı",
    category: "Nörobilim",
    difficulty: "Başlangıç",
    word_count: countWordsInParagraphs(speedTest1Paragraphs),
    paragraphs: speedTest1Paragraphs,
    questions: [
      {
        id: "q1-1",
        book_id: "st-neuro-reading",
        question_text:
          "Metne göre yetişkinlerin okuma hızını dakikada 150-250 kelime aralığında sınırlayan temel alışkanlık nedir?",
        options: [
          "Göz kaslarının çabuk yorulması",
          "Kelimeleri zihinde sessizce telaffuz etme (iç seslendirme)",
          "Harflerin punto boyutunun küçük olması",
          "Satır aralıklarının dar olması",
        ],
        correct_option: 1,
      },
      {
        id: "q1-2",
        book_id: "st-neuro-reading",
        question_text:
          "Okuma sırasında gözün önceki kelimelere istemsizce geri dönmesine ne ad verilir ve okuma süresinin yaklaşık ne kadarını kaybettirir?",
        options: [
          "Fiksasyon — %10",
          "Sakkad — %50",
          "Regresyon — %25",
          "Periferik kayma — %40",
        ],
        correct_option: 2,
      },
      {
        id: "q1-3",
        book_id: "st-neuro-reading",
        question_text:
          "Çevresel görüş (periferik algı) alanının genişletilmesi okuyucuya nasıl bir avantaj sağlar?",
        options: [
          "Tek bir noktaya odaklanırken bile yanlardaki kelime gruplarını anlam bloğu olarak kavramayı sağlar",
          "Sadece satır başlarını okuyarak kitabı bitirmeyi sağlar",
          "Kelimelerin sesli telaffuzunu hızlandırır",
          "Karanlık ortamda okuma yapmayı kolaylaştırır",
        ],
        correct_option: 0,
      },
      {
        id: "q1-4",
        book_id: "st-neuro-reading",
        question_text:
          "Kelime-kelime yerine anlam bloklarıyla okumanın çalışma belleği (working memory) üzerindeki etkisi nedir?",
        options: [
          "Çalışma belleğini tamamen devre dışı bırakır",
          "Bilişsel yükü azaltarak beynin doğrudan ana fikre ve kavramlar arası ilişkilere odaklanmasını sağlar",
          "Kısa süreli belleği zorlayarak yorgunluğu artırır",
          "Sadece ezber yeteneğini güçlendirir",
        ],
        correct_option: 1,
      },
    ],
  },
  {
    id: "st-deep-focus",
    title: "Dikkat Ekonomisi, Miyelin ve Akış Hali",
    category: "Bilişsel Psikoloji",
    difficulty: "Orta",
    word_count: countWordsInParagraphs(speedTest2Paragraphs),
    paragraphs: speedTest2Paragraphs,
    questions: [
      {
        id: "q2-1",
        book_id: "st-deep-focus",
        question_text:
          "Metne göre bir görev sırasında dikkatin dağılmasının ardından zihnin önceki derin odaklanma seviyesine dönmesi ortalama ne kadar sürer?",
        options: ["30 saniye", "5 dakika", "23 dakika", "1 saat"],
        correct_option: 2,
      },
      {
        id: "q2-2",
        book_id: "st-deep-focus",
        question_text:
          "Derin çalışma ve odaklı okuma sırasında nöronların etrafında kalınlaşarak sinyal iletim hızını artıran yapı hangisidir?",
        options: [
          "Miyelin kılıfı",
          "Optik sinir ucu",
          "Hipokampus zarı",
          "Kortikal filtre",
        ],
        correct_option: 0,
      },
      {
        id: "q2-3",
        book_id: "st-deep-focus",
        question_text:
          "Çok yavaş okumanın odaklanmayı bozmasının temel nedeni metinde nasıl açıklanmaktadır?",
        options: [
          "Göz kapaklarının ağırlaşması",
          "Beynin düşünce üretme hızı (~400 WPM) ile düşük okuma hızı arasındaki boşluğun zihni başka düşüncelere kaydırması",
          "Sayfa çevirme sıklığının azalması",
          "Kelimelerin anlamının unutulması",
        ],
        correct_option: 1,
      },
      {
        id: "q2-4",
        book_id: "st-deep-focus",
        question_text:
          "Görev zorluğu ile beceri seviyesi dengelendiğinde ortaya çıkan ve okunan bilginin kalıcı kodlanmasını sağlayan durum nedir?",
        options: [
          "Bilişsel geçiş durumu",
          "Sürekli kısmi dikkat",
          "Akış (Flow) hali",
          "Refleksif tarama",
        ],
        correct_option: 2,
      },
    ],
  },
  {
    id: "st-mental-models",
    title: "Polimat Zihinler ve Disiplinlerarası Düşünce",
    category: "Felsefe & Bilim",
    difficulty: "İleri",
    word_count: countWordsInParagraphs(speedTest3Paragraphs),
    paragraphs: speedTest3Paragraphs,
    questions: [
      {
        id: "q3-1",
        book_id: "st-mental-models",
        question_text:
          "Metne göre dış dünyanın nasıl işlediğine dair zihnimizde kurduğumuz kavramsal çerçevelere ne ad verilir?",
        options: [
          "Algısal filtreler",
          "Zihinsel modeller (Mental models)",
          "Refleks yayları",
          "Semantik kodlar",
        ],
        correct_option: 1,
      },
      {
        id: "q3-2",
        book_id: "st-mental-models",
        question_text:
          "Yaratıcılık olgusu metinde nasıl tanımlanmaktadır?",
        options: [
          "Tek bir alanda diğer tüm alanları reddederek çalışmak",
          "Zihinde daha önce temas etmemiş iki farklı bilgi düğümü arasında beklenmedik bir köprü kurmak",
          "Kitapları hiç not almadan en yüksek hızda bitirmek",
          "Yalnızca klasik eserleri ezberlemek",
        ],
        correct_option: 1,
      },
      {
        id: "q3-3",
        book_id: "st-mental-models",
        question_text:
          "Metinde aşağıdakilerden hangisi disiplinlerarası düşünceye örnek verilen kavramlardan biri değildir?",
        options: [
          "Fizikteki entropi yasası",
          "Ekonomideki fırsat maliyeti",
          "Mühendislikteki geri besleme döngüleri",
          "Astrolojideki gezegen evleri",
        ],
        correct_option: 3,
      },
      {
        id: "q3-4",
        book_id: "st-mental-models",
        question_text:
          "Stratejik okuma yaklaşımına göre okuyucu nasıl hareket etmelidir?",
        options: [
          "Her kitabı sabit 1000 WPM hızında okumalıdır",
          "Metnin amacına ve türüne göre okuma hızı ve yöntemini (tarama, RSVP, analitik Pacer) esnek biçimde değiştirebilmelidir",
          "Sadece özet kitapları okumalıdır",
          "Not almayı tamamen bırakmalıdır",
        ],
        correct_option: 1,
      },
    ],
  },
];

const book1Content = [
  "Bölüm 1: Odaklanmanın Nörobiyolojisi. İnsan beyni yaklaşık seksen altı milyar nörondan oluşan karmaşık bir iletişim ağıdır. Her saniye duyularımız aracılığıyla milyonlarca bitlik ham veri beynimize ulaşır; ancak bilinçli zihnimiz bunun yalnızca çok küçük bir kısmını işleyebilir. Dikkat dediğimiz mekanizma, bu devasa veri okyanusunda hangi sinyallerin öne çıkarılacağını ve hangilerinin bastırılacağını seçen biyolojik bir projektördür.",
  "Okuma eylemi sırasında bu projektör görsel korteks ile dil merkezleri arasında senkronize bir köprü kurar. Gözlerimiz sayfa üzerindeki siyah sembolleri tararken, talamus ve prefrontal korteks dış dünyadan gelen sesleri ve alakasız düşünceleri filtreler. Eğer okuma hızımız çok yavaşsa, dikkat projektörü sayfa üzerinde yeterince uyarılmaz ve çevredeki diğer uyaranları aydınlatmaya başlar.",
  "Bölüm 2: Görsel Ritim ve Sakkadik Akış. İyi bir piyanistin parmakları tuşlar üzerinde nasıl akıcı bir ritimle hareket ediyorsa, usta bir okuyucunun gözleri de satırlar üzerinde öyle ritmik sıçramalar yapar. Her satırda sekiz-on kez duraksamak yerine, satırı üç veya dört ana odak noktasında kavrayabilmek görsel ritmin temelidir.",
  "Bu ritmi kazanmanın en pratik yolu, gözün doğal olarak kelimenin tam ortasına değil, ortanın hafif soluna (Optimal Recognition Point - ORP) odaklandığını fark etmektir. Beyin, bir kelimenin ilk birkaç harfini ve genel uzunluğunu gördüğünde, bağlamın da yardımıyla kelimenin tamamını milisaniyeler içinde tanır. RSVP ve Magic Pacer egzersizleri, beynin bu doğal tahmin ve tanıma motorunu tam kapasiteyle çalıştırır.",
  "Bölüm 3: Kalıcı Bellek ve Aktif Sentez. Hızlı okumak, metni yüzeysel olarak geçmek demek değildir. Aksine, yüksek odakla okunan bir bölümün sonunda iki saniyelik bir zihinsel özet yapmak, bilginin hipokampustan neokortekse aktarılmasını hızlandırır. Okuduğunuz her önemli kavramı kendi kelimelerinizle kısa bir nota dönüştürdüğünüzde, pasif bir izleyiciden aktif bir düşünce mimarına dönüşürsünüz."
];

const book2Content = [
  "Bölüm 1: İçsel Kale ve Kontrol Dikotomisi. Stoa felsefesinin en güçlü ilkesi, dünyadaki olayları iki net kategoriye ayırmaktır: kontrolümüz dahilinde olanlar ve kontrolümüz dışında olanlar. Kendi düşüncelerimiz, niyetlerimiz, dikkatimizi nereye verdiğimiz ve olaylara nasıl tepki gösterdiğimiz tamamen bizim elimizdedir. Hava durumu, başkalarının hakkımızdaki yargıları veya geçmişte yaşanmış olaylar ise kontrolümüzün dışındadır.",
  "Marcus Aurelius, Roma İmparatorluğu'nun en çalkantılı dönemlerinde bile her akşam çadırında kendine ait notlar yazarak zihnini berraklaştırmıştır. Bugün 'Kendime Düşünceler' olarak bildiğimiz bu eser, dış dünyadaki fırtınalar ne kadar şiddetli olursa olsun insanın kendi zihninde sarsılmaz bir sığınak inşa edebileceğini hatırlatır.",
  "Bölüm 2: Zamanın Değeri ve Bilinçli Yaşam. Seneca, 'Yaşamın Kısalığı Üzerine' adlı mektubunda insanların para ve mülklerini korurken son derece kıskanç davrandıklarını, ancak tek geri döndürülemez kaynak olan zamanı dağıtırken inanılmaz derecede savurgan olduklarını vurgular. Bize verilen ömür aslında kısa değildir; biz onu amaçsız uğraşlarla ve dağınık bir dikkatle harcadığımız için kısa hale getiririz.",
  "Bir kitabı tam bir mevcudiyetle okumak, Stoacı anlamda şimdiki ana sahip çıkmanın en zarif biçimlerinden biridir. Zihni geçmişin pişmanlıklarından ve geleceğin kurgusal kaygılarından çekip çıkararak, önümüzdeki cümlenin hakikatine odaklamak hem entelektüel hem de ruhsal bir disiplindir."
];

const book3Content = [
  "Bölüm 1: Silikon ve Sinaps. Yirminci yüzyılın ortalarında Alan Turing, makinelerin düşünüp düşünemeyeceği sorusunu ortaya attığında, bilişsel bilim ile bilgisayar bilimi arasında kopmaz bir bağ kuruldu. Günümüzün büyük dil modelleri ve derin öğrenme mimarileri, insan beynindeki sinaptik ağırlıkların matematiksel birer soyutlaması olan yapay sinir ağları üzerine inşa edilmiştir.",
  "Ancak insan zekası ile yapay zeka arasında temel bir fark vardır: Yapay modeller milyarlarca metin örneği üzerinden istatistiksel olasılıkları hesaplarken, insan zihni çok az sayıda deneyimden derin nedensel çıkarımlar ve sezgisel sıçramalar üretebilir. Biz bir cümleyi okurken yalnızca kelimelerin dizilimini değil, yazarın niyetini, tarihsel bağlamı ve duygusal tonu da aynı anda hissederiz.",
  "Bölüm 2: Hibrit Zeka Çağı. Geleceğin en başarılı bilgi çalışanları, yapay zekayla rekabet etmeye çalışanlar değil, kendi biyolojik bilişsel kapasitelerini teknolojik araçlarla birleştiren 'hibrit düşünürler' olacaktır. Yapay zeka devasa veri yığınlarını özetleyebilir; fakat hangi soruların sorulacağına, hangi etik ilkelerin korunacağına ve farklı fikirlerin nasıl özgün bir vizyona dönüştürüleceğine karar veren yine eğitilmiş insan zihnidir.",
  "Bu nedenle okuma hızınızı, kavrama derinliğinizi ve eleştirel düşünme refleksinizi geliştirmek, otomasyon çağında sahip olabileceğiniz en stratejik kaldıraçtır. Zihninizin bant genişliğini artırdığınızda, teknolojiyi tüketen değil yönlendiren tarafta yer alırsınız."
];

const book4Content = [
  "Bölüm 1: Görsel Algının Sınırlarını Genişletmek. Gözlerimiz dünyaya açılan pasif kameralar değil, beynin dışarıya uzanan aktif uzantılarıdır. Retinanın merkezinde yer alan 'fovea' bölgesi yüksek çözünürlüklü detayları yakalarken, onu çevreleyen parafoveal ve periferik bölgeler hareketi, genel şekilleri ve kelime silüetlerini algılar.",
  "Geleneksel okuma alışkanlığında okuyucu yalnızca fovea bölgesine güvenir ve her kelimeyi bu dar merceğin altına getirmeye çalışır. Oysa Schulte tablosu ve çevresel görüş egzersizleriyle parafoveal algı eğitildiğinde, göz satırın ortasındaki bir kelimeye sabitlenirken bir sonraki kelimenin yapısını önceden (pre-processing) çözümlemeye başlar.",
  "Bölüm 2: Bilişsel Dayanıklılık. Tıpkı bir maraton koşucusunun kaslarını kademeli olarak daha yüksek tempoya alıştırması gibi, görsel-bilişsel sistemimiz de 'aşırı hız antrenmanı' (overspeed training) ile gelişir. Normal okuma hızınızın yüzde elli üzerinde yapılan kısa süreli RSVP veya Pacer egzersizleri, normal okuma hızınıza döndüğünüzde metnin size çok daha rahat ve akıcı gelmesini sağlar."
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: "book-neuro-focus",
    title: "Hiper-Odak ve Hızlı Okuma Bilimi",
    author: "Dr. Selim Kaya",
    category: "Nörobilim",
    difficulty_level: "Başlangıç",
    word_count: countWordsInParagraphs(book1Content),
    cover_gradient: "from-indigo-600 via-violet-600 to-purple-700",
    summary:
      "Görsel korteks, ORP noktası, sakkadik göz hareketleri ve çalışma belleğini optimize ederek okuma hızını ikiye katlamanın bilimsel temelleri.",
    content: book1Content,
    questions: [
      {
        id: "bq-1",
        book_id: "book-neuro-focus",
        question_text:
          "Kitaba göre göz bir kelimeyi tanırken doğal olarak nereye odaklanır?",
        options: [
          "Kelimenin son harfine",
          "Kelimenin tam ortasının hafif soluna (ORP noktası)",
          "Sadece büyük harflere",
          "Satır sonundaki noktalama işaretine",
        ],
        correct_option: 1,
      },
      {
        id: "bq-2",
        book_id: "book-neuro-focus",
        question_text:
          "Okunan bilginin hipokampustan neokortekse (kalıcı belleğe) aktarılmasını hızlandıran yöntem nedir?",
        options: [
          "Bölüm sonunda iki saniyelik zihinsel özet yapmak ve kendi kelimelerinle kısa not almak",
          "Aynı cümleyi beş kez üst üste okumak",
          "Yüksek sesle fısıldayarak okumak",
          "Gözleri kapatıp beklemek",
        ],
        correct_option: 0,
      },
    ],
  },
  {
    id: "book-stoa-mind",
    title: "İçsel Kale: Modern Çağda Stoa Disiplini",
    author: "Prof. Ece Arslan",
    category: "Felsefe",
    difficulty_level: "Orta",
    word_count: countWordsInParagraphs(book2Content),
    cover_gradient: "from-amber-600 via-orange-600 to-rose-700",
    summary:
      "Marcus Aurelius ve Seneca'nın öğretileri ışığında dikkati yönetmek, zamanı bilinçli kullanmak ve zihinsel dinginliği korumak.",
    content: book2Content,
    questions: [
      {
        id: "bq-3",
        book_id: "book-stoa-mind",
        question_text:
          "Seneca'ya göre insanların korurken en savurgan davrandıkları ve geri döndürülemez olan kaynak nedir?",
        options: ["Altın ve mülk", "Zaman", "Sosyal statü", "Fiziksel güç"],
        correct_option: 1,
      },
    ],
  },
  {
    id: "book-hybrid-ai",
    title: "Silikon ve Sinaps: Hibrit Zeka Çağı",
    author: "Mert Demirtaş",
    category: "Teknoloji",
    difficulty_level: "İleri",
    word_count: countWordsInParagraphs(book3Content),
    cover_gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    summary:
      "Yapay sinir ağları ile biyolojik zeka arasındaki farklar ve otomasyon çağında insan zihninin bilişsel bant genişliğini artırma stratejileri.",
    content: book3Content,
    questions: [
      {
        id: "bq-4",
        book_id: "book-hybrid-ai",
        question_text:
          "Kitapta geleceğin en başarılı bilgi çalışanları nasıl tanımlanmaktadır?",
        options: [
          "Teknolojiyi tamamen reddedenler",
          "Kendi biyolojik bilişsel kapasitelerini teknolojik araçlarla birleştiren 'hibrit düşünürler'",
          "Yalnızca kod yazan makineler",
          "Okumayı bırakıp sadece özet dinleyenler",
        ],
        correct_option: 1,
      },
    ],
  },
  {
    id: "book-visual-athlete",
    title: "Görsel Atlet: Parafoveal Algı Rehberi",
    author: "Zeynep Koray",
    category: "Bilişsel Gelişim",
    difficulty_level: "Orta",
    word_count: countWordsInParagraphs(book4Content),
    cover_gradient: "from-blue-600 via-sky-600 to-indigo-700",
    summary:
      "Retinanın fovea ve parafoveal bölgelerini birlikte kullanarak kelime bloklarını ön-işleme (pre-processing) ile okuma teknikleri.",
    content: book4Content,
  },
];

export const DRILL_SAMPLE_TEXTS = [
  {
    id: "drill-text-1",
    title: "Nöroplastisite ve Öğrenme Hızı",
    category: "Nörobilim",
    paragraphs: [
      "Yetişkin beyninin değişmez ve sabit olduğu yönündeki eski bilimsel kabul, son yirmi yıldaki nörogörüntüleme çalışmalarıyla tamamen yıkılmıştır. Beynimiz, yaşam boyu yeni sinaptik bağlantılar kurabilme ve mevcut ağları yeniden yapılandırabilme yeteneğine sahiptir; bu muazzam özelliğe nöroplastisite adı verilir.",
      "Göz kaslarımızı ve görsel algı merkezimizi her gün düzenli olarak normal hızımızın biraz üzerinde çalıştırdığımızda, görsel korteks bu yeni tempoya uyum sağlar. Başlangıçta hızlı akan kelimeler zihinde hafif bir bulanıklık yaratsa da, birkaç dakikalık odaklanmanın ardından beyin gereksiz iç seslendirmeyi kapatır ve kelimeleri doğrudan kavram olarak yakalamaya başlar.",
      "Bu egzersiz sırasında gözlerinizi ekranın merkezinde sabit tutmaya ve kelimelerin peşinden koşmak yerine kelimelerin sizin odak noktanıza gelmesine izin vermeye odaklanın. Zihniniz ne kadar sakin ve gevşek olursa, görsel algı alanınız o kadar genişleyecektir."
    ],
  },
  {
    id: "drill-text-2",
    title: "Kuantum Dünyası ve Gözlemci Etkisi",
    category: "Bilim",
    paragraphs: [
      "Klasik fizik, evreni tıpkı dev bir saat mekanizması gibi öngörülebilir ve kesin yasalarla çalışan bir sistem olarak tarif ederdi. Ancak yirminci yüzyılın başında atom altı parçacıkların davranışı incelendiğinde, doğanın en temel katmanında olasılıkların ve belirsizliğin hüküm sürdüğü keşfedildi.",
      "Çift yarık deneyinde tek bir elektronun bile gözlemlenmediği sürece aynı anda birden fazla olası yolu takip eden bir dalga gibi davrandığı, fakat ölçüm yapıldığı anda belirli bir konuma çöktüğü görülmüştür. Bilim insanları bu olguyu süperpozisyon ve gözlemci etkisi olarak adlandırır.",
      "Bugün kuantum hesaplama teknolojileri, sıfır ve bir durumlarını aynı anda barındırabilen kübitler sayesinde, klasik süper bilgisayarların binlerce yılda çözebileceği moleküler simülasyon ve optimizasyon problemlerini dakikalar içinde çözme potansiyeli taşımaktadır."
    ],
  },
  {
    id: "drill-text-3",
    title: "Minimalizm ve Bilişsel Berraklık",
    category: "Yaşam & Felsefe",
    paragraphs: [
      "Fiziksel çevremizdeki karmaşa ile zihinsel berraklığımız arasında doğrudan bir geri besleme döngüsü bulunur. Görüş alanımızdaki her nesne, açık kalan her sekme ve yarım bırakılmış her iş, beynimizin arka planında küçük de olsa bir işlemci gücü tüketir.",
      "Dijital ve zihinsel minimalizm, hayatımızdan her şeyi çıkarmak değil, yalnızca gerçekten değer üreten ve anlam taşıyan unsurlara alan açmaktır. Okuma alışkanlığında da aynı ilke geçerlidir: Dikkat dağıtıcı unsurlardan arındırılmış sade bir arayüz, zihnin tüm enerjisini metnin özüne yönlendirmesini sağlar."
    ],
  },
];
