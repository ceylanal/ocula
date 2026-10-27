import { ComprehensionQuestion, SpeedTestArticle } from "@/types";
import { countWordsInParagraphs } from "@/lib/textUtils";

function question(
  articleId: string,
  n: number,
  question_text: string,
  options: string[],
  correct_option: number
): ComprehensionQuestion {
  return {
    id: `${articleId}-q${n}`,
    book_id: articleId,
    question_text,
    options,
    correct_option,
  };
}

function article(
  base: Omit<SpeedTestArticle, "word_count">
): SpeedTestArticle {
  return { ...base, word_count: countWordsInParagraphs(base.paragraphs) };
}

/**
 * Kalibrasyon havuzuna eklenen metinler:
 * Kolay (akıcı edebi), Orta (popüler bilim), Zor (akademik & felsefi).
 */
export const ADDITIONAL_SPEED_TEST_ARTICLES: SpeedTestArticle[] = [
  article({
    id: "st-harbor-morning",
    title: "Limanda Bir Sabah",
    category: "Edebi Anlatı",
    difficulty: "Başlangıç",
    paragraphs: [
      "Sabahın ilk ışıkları limanın üzerine inerken Hasan Usta çoktan iskelenin ucuna oturmuş, ağlarını onarıyordu. Denizden gelen soğuk rüzgâr, yüzündeki derin çizgilerin arasından geçip gidiyor, o ise başını kaldırmadan iğneyi bir ilmekten diğerine sürüyordu. Kırk yıldır aynı iskelede, aynı tahta kutunun üzerinde oturur, her sabah aynı sessizlikle işe koyulurdu.",
      "Martılar teknelerin direklerine tek tek konmaya başladığında, küçük torunu Elif elinde sıcak bir çay bardağıyla göründü. Bardağı dedesinin yanına bırakıp karşısına çömeldi ve ağın düğümlerine baktı. 'Bu düğümleri sana kim öğretti?' diye sordu. Hasan Usta gülümsedi. 'Babam,' dedi, 'ama bana düğüm atmayı değil, sabretmeyi öğretti. Düğüm, sabrın gözle görülen halinden başka bir şey değildir.'",
      "Elif bu cevabı pek anlamadı ama dedesinin sesindeki yumuşaklığı sevdi. İkisi birlikte uzun uzun denize baktılar. Ufukta balıkçı teknelerinin küçük noktaları belirmişti: biri kırmızı, biri mavi, biri de solmuş sarı. Hasan Usta, sarı olanın Kâmil Kaptan'ın teknesi olduğunu, onun kırk yıldır tek bir sabahı bile kaçırmadığını anlattı.",
      "Güneş yükseldikçe liman uyanmaya başladı. Simitçinin arabası kaldırımda tıngırdadı, kahvehanenin sandalyeleri dışarı çıkarıldı. Elif ağın bir ucunu tutup dedesine yardım etti; parmakları önce beceriksizce, sonra giderek daha emin hareket etti. Öğle olduğunda ilk düğümünü atmıştı. Biraz eğriydi ama sağlamdı. Hasan Usta onu eline alıp uzun uzun inceledi. 'İşte,' dedi, 'artık bu iskelenin bir parçasısın.'",
    ],
    questions: [
      question(
        "st-harbor-morning",
        1,
        "Hasan Usta sabahın ilk ışıklarında iskelede ne yapıyordu?",
        [
          "Balık tutmak için olta hazırlıyordu",
          "Teknesini boyuyordu",
          "Ağlarını onarıyordu",
          "Torunuyla çay içiyordu",
        ],
        2
      ),
      question(
        "st-harbor-morning",
        2,
        "Hasan Usta'ya göre babası ona asıl olarak neyi öğretmiştir?",
        [
          "Düğüm atmanın en hızlı yolunu",
          "Sabretmeyi",
          "Tekne kullanmayı",
          "Denizi sevmeyi",
        ],
        1
      ),
      question(
        "st-harbor-morning",
        3,
        "Metinde sarı teknenin sahibi hakkında hangi bilgi verilir?",
        [
          "Limana yeni gelmiş bir balıkçıdır",
          "Kırk yıldır hiçbir sabahı kaçırmamıştır",
          "Hasan Usta'nın akrabasıdır",
          "Teknesini satmayı düşünmektedir",
        ],
        1
      ),
      question(
        "st-harbor-morning",
        4,
        "Öğle vaktinde Elif ne başarmıştır ve Hasan Usta nasıl karşılık vermiştir?",
        [
          "Ağı tamamen onarmış, dedesi onu ödüllendirmiştir",
          "Tekneye binmiş, dedesi onu uyarmıştır",
          "Çayı dökmüş, dedesi onu azarlamıştır",
          "İlk düğümünü atmış, dedesi onu iskelenin bir parçası saymıştır",
        ],
        3
      ),
    ],
  }),
  article({
    id: "st-bookseller-silence",
    title: "Kitapçının Sessizliği",
    category: "Deneme",
    difficulty: "Başlangıç",
    paragraphs: [
      "Eski bir kitapçı dükkânına girdiğinizde ilk fark ettiğiniz şey kokudur: yıpranmış kâğıdın, deri ciltlerin ve zamanın birleştiği o tatlı, hafif nemli koku. İkinci fark ettiğiniz şey ise sessizliktir. Bu sessizlik bir boşluk değil, bin ayrı sesin aynı anda kısık sesle konuştuğu bir kalabalıktır; raflardaki her kitap, bir başka insanın bir başka çağda ve bir başka şehirde kurduğu cümlelerin sabırla beklediği bir odadır.",
      "Kitapçı Necati Bey otuz yıldır bu dükkânın kasasında oturur. Müşterilerine kitap önermeden önce yalnızca kim olduklarını anlamaya çalışır. 'Bir insana ihtiyacı olan kitabı vermek, ona istediği kitabı vermekten çok daha zordur,' der. Bir keresinde hüzünlü görünen bir öğrenciye, aradığı felsefe kitabı yerine ince bir öykü kitabı uzatmış, öğrenci ertesi hafta teşekkür etmek için geri gelmişti.",
      "Dükkânın en arka köşesinde, tavana kadar yükselen raflarla çevrili küçük bir okuma masası vardır. Masanın üzerinde her zaman bir demlik çay ve birkaç yarım kalmış kitap durur. Necati Bey'e göre yarım kalmış bir kitap, başarısızlığın değil, yeniden dönmeye değer bir yerin işaretidir. Okurlar çoğu zaman o kitaplara aylar sonra bile aynı sayfadan devam etmek üzere geri gelir.",
      "Akşam olup dükkânın ışıkları söndüğünde Necati Bey kapıyı kilitlemeden önce son bir kez rafları süzer. Karanlıkta bile her kitabın yerini bilir. Ona göre bir kitapçı, kitap satan kişi değil, kitaplarla insanlar arasındaki sessiz tanıştırıcıdır. Bu yüzden dükkânı hiçbir zaman büyütmedi; çünkü tanışmanın kalabalıkta değil, küçük ve sakin bir odada gerçekleştiğine inanıyor.",
    ],
    questions: [
      question(
        "st-bookseller-silence",
        1,
        "Metne göre eski bir kitapçıya girildiğinde koku dışında fark edilen ikinci şey nedir?",
        [
          "Kitapların fiyatları",
          "Sessizlik",
          "Raflardaki düzen",
          "Dükkânın aydınlığı",
        ],
        1
      ),
      question(
        "st-bookseller-silence",
        2,
        "Necati Bey'e göre hangisi daha zordur?",
        [
          "İhtiyacı olan kitabı vermek, istenen kitabı vermekten daha zordur",
          "İstenen kitabı bulmak, onu satmaktan daha zordur",
          "Yeni kitap getirtmek, eskileri saklamaktan daha zordur",
          "Öğrencilere kitap satmak, yetişkinlere satmaktan daha zordur",
        ],
        0
      ),
      question(
        "st-bookseller-silence",
        3,
        "Necati Bey yarım kalmış kitapları nasıl yorumlar?",
        [
          "Okurun sabırsızlığının kanıtı olarak",
          "Dükkânın düzenini bozan bir sorun olarak",
          "Satılamayan kitapların işareti olarak",
          "Yeniden dönmeye değer bir yerin işareti olarak",
        ],
        3
      ),
      question(
        "st-bookseller-silence",
        4,
        "Necati Bey dükkânını neden hiçbir zaman büyütmemiştir?",
        [
          "Kira bedeli çok yüksek olduğu için",
          "Yeni kitaplar almak istemediği için",
          "Tanışmanın küçük ve sakin bir odada gerçekleştiğine inandığı için",
          "Müşterilerin kalabalıktan hoşlanmadığını düşündüğü için",
        ],
        2
      ),
    ],
  }),
  article({
    id: "st-ocean-currents",
    title: "Okyanus Akıntıları ve İklimin Ritmi",
    category: "Yer Bilimleri",
    difficulty: "Orta",
    paragraphs: [
      "Okyanuslar, Dünya yüzeyinin yaklaşık yüzde yetmişini kaplar ve atmosferden çok daha fazla ısı depolar. Bu devasa su kütlesi durağan değildir; rüzgârların, Dünya'nın dönüşünün ve suyun sıcaklığı ile tuzluluğundaki farkların etkisiyle sürekli hareket eder. Yüzeydeki akıntılar daha çok rüzgârlar tarafından sürüklenirken, derindeki akıntıları belirleyen temel etken suyun yoğunluğudur ve bu yoğunluk sıcaklık ile tuzluluğa bağlıdır.",
      "Bilim insanlarının 'termohalin dolaşım' adını verdiği bu derin akıntı sistemi, bazen 'okyanus taşıma bandı' diye de anılır. Kuzey Atlantik'te soğuyan ve tuzluluğu artan yüzey suyu ağırlaşarak dibe çöker. Bu batış, güneyden gelen ılık suyun yüzeyde kuzeye doğru çekilmesine neden olur. Böylece tropik bölgelerde biriken ısı, Avrupa'nın batı kıyılarına kadar taşınır ve bu kıyıların aynı enlemdeki diğer bölgelere göre daha ılıman bir iklime sahip olmasına katkıda bulunur.",
      "Sistemin bütün döngüsü, tek bir su kütlesinin okyanus havzalarını dolaşıp yüzeye dönmesi için yüzlerce yıl, bazı tahminlere göre bin yıl kadar sürebilir. Bu yavaşlık, sistemi hem kararlı hem de hassas kılar. Kuzey Atlantik'e buzulların erimesiyle tatlı su karışması, yüzey suyunun yoğunluğunu azaltarak batışı zayıflatabilir. Geçmişte bazı soğuk dönemlerin, bu tür bir zayıflamayla ilişkili olduğu düşünülmektedir.",
      "Günümüzde araştırmacılar, bu dolaşımın ne kadar güçlü olduğunu ölçmek için okyanus boyunca yerleştirilmiş sensör dizileri kullanıyor. Elde edilen veriler, dolaşımın yıldan yıla doğal dalgalanmalar gösterdiğini ortaya koyuyor. Bu dalgalanmaların hangi bölümünün uzun vadeli bir eğilime, hangi bölümünün doğal değişkenliğe ait olduğunu ayırmak ise bilimsel açıdan hâlâ tartışmalı ve zorlu bir sorudur.",
    ],
    questions: [
      question(
        "st-ocean-currents",
        1,
        "Metne göre derindeki okyanus akıntılarını belirleyen temel etken nedir?",
        [
          "Rüzgârların şiddeti",
          "Ayın çekim gücü",
          "Suyun yoğunluğu",
          "Kıyıların şekli",
        ],
        2
      ),
      question(
        "st-ocean-currents",
        2,
        "Kuzey Atlantik'teki yüzey suyu neden dibe çöker?",
        [
          "Soğuyup tuzluluğu arttığı için ağırlaşır",
          "Güneşte ısındığı için hafifler ve dağılır",
          "Buzulların erimesiyle tatlı suya dönüşür",
          "Rüzgârlar onu aşağı iter",
        ],
        0
      ),
      question(
        "st-ocean-currents",
        3,
        "Buzulların erimesiyle Kuzey Atlantik'e karışan tatlı suyun olası etkisi nedir?",
        [
          "Dolaşımı hızlandırarak kıyıları ısıtması",
          "Okyanusun tuzluluğunu kalıcı olarak artırması",
          "Yüzeydeki rüzgârları güçlendirmesi",
          "Yoğunluğu azaltarak suyun batışını zayıflatması",
        ],
        3
      ),
      question(
        "st-ocean-currents",
        4,
        "Metne göre araştırmacıların bugün en çok zorlandığı konu hangisidir?",
        [
          "Sensör dizilerini okyanusa yerleştirmek",
          "Uzun vadeli eğilimi doğal değişkenlikten ayırmak",
          "Dolaşımın yüzlerce yıl sürdüğünü kanıtlamak",
          "Tropik bölgelerdeki ısıyı ölçmek",
        ],
        1
      ),
    ],
  }),
  article({
    id: "st-sleep-memory",
    title: "Uyku, Bellek ve Gece Düzenlemesi",
    category: "Sinirbilim",
    difficulty: "Orta",
    paragraphs: [
      "Uykuyu uzun süre beynin tamamen dinlendiği pasif bir durum sanmıştık. Oysa elektroensefalografi kayıtları, uyku sırasında beynin son derece etkin olduğunu gösterdi. Uyku, yaklaşık doksan dakikalık döngüler hâlinde ilerler ve her döngü hafif uyku, derin uyku ile hızlı göz hareketlerinin görüldüğü REM evrelerinden oluşur. Gece boyunca bu döngüler tekrarlanır; ilk döngülerde derin uyku, sabaha doğru ise REM evresi ağırlık kazanır.",
      "Derin uyku evresinde beyin, gün içinde edinilen bilgileri geçici olarak depolandığı bölgelerden uzun süreli depolama alanlarına aktarır. Araştırmacılar, bu sırada 'uyku iğcikleri' adı verilen kısa elektriksel patlamaların görüldüğünü ve bunların öğrenilen bilgilerin kalıcılaşmasıyla ilişkili olduğunu bildiriyor. Yeni bir şey öğrendikten sonra iyi uyuyan kişilerin, aynı süre uyanık kalanlara göre bilgiyi daha iyi hatırladığı birçok deneyde gözlenmiştir.",
      "REM evresi ise daha çok duygusal anıların işlenmesi ve bilgiler arasında yeni bağlantıların kurulmasıyla ilişkilendirilir. Bazı çalışmalarda katılımcılara bir bulmaca verilmiş ve uyku sonrasında çözüm bulma oranlarının belirgin biçimde arttığı görülmüştür. Bu bulgu 'sabah akşamdan hayırlıdır' sözüne bilimsel bir dayanak sağlıyor gibi görünse de, araştırmacılar mekanizmanın ayrıntılarının hâlâ tam anlaşılmadığını vurguluyor.",
      "Uykusuzluğun etkileri ise bunun tersini gösterir. Yetersiz uyku, dikkat süresini kısaltır, yeni bilgiyi kodlama kapasitesini azaltır ve duygusal tepkileri güçlendirir. Bu nedenle sınav öncesi bütün geceyi ders çalışarak geçirmek, kısa vadede daha fazla zaman kazandırıyor gibi görünse de, öğrenilenlerin kalıcılığı açısından çoğu zaman olumsuz sonuç verir.",
    ],
    questions: [
      question(
        "st-sleep-memory",
        1,
        "Metne göre bir uyku döngüsü yaklaşık ne kadar sürer?",
        ["Otuz dakika", "Doksan dakika", "Üç saat", "Sekiz saat"],
        1
      ),
      question(
        "st-sleep-memory",
        2,
        "Derin uyku evresinin bellekle ilişkili işlevi nedir?",
        [
          "Duygusal anıları silmek",
          "Rüyaları daha canlı hale getirmek",
          "Dikkat süresini uzatmak",
          "Bilgiyi geçici depodan uzun süreli depoya aktarmak",
        ],
        3
      ),
      question(
        "st-sleep-memory",
        3,
        "REM evresi metinde hangi işlevlerle ilişkilendirilmektedir?",
        [
          "Duygusal anıların işlenmesi ve bilgiler arasında yeni bağlantılar kurulması",
          "Kasların onarılması ve büyüme hormonunun salgılanması",
          "Uyku iğciklerinin üretilmesi",
          "Hafif uykudan uyanıklığa geçişin hızlandırılması",
        ],
        0
      ),
      question(
        "st-sleep-memory",
        4,
        "Metne göre sınav öncesi bütün geceyi ders çalışarak geçirmenin sonucu nedir?",
        [
          "Öğrenilenlerin kalıcılığı genellikle artar",
          "Duygusal tepkiler zayıflar",
          "Öğrenilenlerin kalıcılığı açısından çoğu zaman olumsuz sonuç verir",
          "Sonuç kişiden kişiye değişmez",
        ],
        2
      ),
    ],
  }),
  article({
    id: "st-bergson-duree",
    title: "Süre ve Saat Zamanı: Bergson'un Ayrımı",
    category: "Zaman Felsefesi",
    difficulty: "İleri",
    paragraphs: [
      "Henri Bergson felsefesinin merkezinde, zamanın bilimsel ölçümü ile yaşanan zamanın deneyimi arasındaki ayrım yer alır. Fizikte zaman, birbirine eşit aralıklara bölünebilen, saatle ölçülebilen ve uzamsal bir çizgi gibi tasarlanabilen bir niceliktir. Bergson'a göre bu tasarım, zamanı kendi niteliğinden soyutlayarak uzamın bir türüne indirger; çünkü uzamda bölümler yan yana durur, zamanda ise her an bir öncekinin içinde yaşanır ve onu sürdürür.",
      "Bu nedenle Bergson, bilincin gerçek zamansal yapısını 'süre' (durée) kavramıyla adlandırır. Süre, ardışık anların birbirinden ayrılmış birimler hâlinde dizilmesi değil, geçmişin şimdiye sürekli sızdığı, niteliksel olarak kesintisiz bir akıştır. Bir melodiyi dinlerken notaları tek tek ayırıp saymayız; her nota, öncekilerin yankısını taşıyarak bir bütünlük içinde algılanır. Melodinin kavranması, bu iç içe geçmişliğin yaşanmasına bağlıdır.",
      "Bergson'un eleştirisi yalnızca bilimsel zaman anlayışına yönelmez; aynı zamanda zekânın doğası hakkında da bir iddia içerir. Ona göre zekâ, pratik eylemin gereklerine uygun olarak gelişmiştir ve bu yüzden hareketi durağan parçalara, akışı sabit nesnelere bölmeye yatkındır. Bu yatkınlık günlük yaşamda yararlıdır; ancak yaşamın ve bilincin özünü kavramaya çalıştığımızda yanıltıcı olabilir. Bu noktada Bergson, sezgiyi nesneyi dışından değil içinden kavrayan bir bilgi yöntemi olarak önerir.",
      "Bergson'un görüşleri dönemin bilim anlayışıyla yalnızca çatışmakla kalmadı, fizikçilerle de ünlü tartışmalara yol açtı. Eleştirmenleri, süre kavramının bilimsel olarak sınanabilir bir içerikten yoksun olduğunu savundu. Savunucuları ise Bergson'un amacının bilimi reddetmek değil, bilimsel soyutlamanın sınırlarını göstermek olduğunu belirtti. Bu tartışma, bugün bile bilinç felsefesinde öznel deneyim ile nesnel ölçüm arasındaki gerilimin başlıca örneklerinden biri olarak anılmaktadır.",
    ],
    questions: [
      question(
        "st-bergson-duree",
        1,
        "Bergson'a göre zamanı eşit aralıklara bölünebilen bir nicelik olarak tasarlamanın temel sorunu nedir?",
        [
          "Saatlerin yeterince hassas olmaması",
          "Zamanın yalnızca geçmişe ait olduğunu varsayması",
          "Bilimsel yöntemlerin deneye dayanmaması",
          "Zamanı kendi niteliğinden soyutlayıp uzamın bir türüne indirgemesi",
        ],
        3
      ),
      question(
        "st-bergson-duree",
        2,
        "Bergson'un 'süre' (durée) kavramı neyi ifade eder?",
        [
          "Saatle ölçülen eşit zaman aralıklarını",
          "Geçmişin şimdiye sürekli sızdığı, niteliksel olarak kesintisiz bir akışı",
          "Ardışık anların birbirinden bağımsız dizisini",
          "Geleceğe dair öngörülerin toplamını",
        ],
        1
      ),
      question(
        "st-bergson-duree",
        3,
        "Metindeki melodi örneği hangi düşünceyi açıklamak için kullanılmıştır?",
        [
          "Müziğin matematiksel bir yapıya sahip olduğunu",
          "Notaların ezberlenmesinin zorluğunu",
          "Bilinçte anların ayrı birimler değil iç içe geçmiş bir bütün olarak yaşandığını",
          "Zekânın en iyi sanat yoluyla geliştiğini",
        ],
        2
      ),
      question(
        "st-bergson-duree",
        4,
        "Bergson'a göre zekâ ile sezgi arasındaki fark nedir?",
        [
          "Zekâ akışı sabit parçalara bölmeye yatkındır; sezgi nesneyi içinden kavrar",
          "Zekâ nesneyi içinden kavrar; sezgi onu parçalara böler",
          "İkisi de aynı bilgi yöntemlerinin farklı adlarıdır",
          "Zekâ yalnızca bilimde, sezgi yalnızca sanatta kullanılır",
        ],
        0
      ),
    ],
  }),
  article({
    id: "st-popper-falsifiability",
    title: "Yanlışlanabilirlik İlkesi ve Bilimsel Bilginin Sınırı",
    category: "Bilim Felsefesi",
    difficulty: "İleri",
    paragraphs: [
      "Karl Popper, bilimi bilim olmayandan ayıran ölçütün ne olduğu sorusuna, dönemin hâkim görüşü olan doğrulanabilirlik ilkesinden farklı bir yanıt verdi. Mantıksal pozitivistler, anlamlı bir önermenin gözlemle doğrulanabilen önerme olduğunu savunuyordu. Popper ise tümevarımın, yani sonlu sayıdaki gözlemden evrensel bir yasaya ulaşma işleminin, mantıksal olarak hiçbir zaman kesin bir temele oturtulamayacağını belirtti: yüzlerce beyaz kuğu gözlemlemek 'bütün kuğular beyazdır' önermesini kesinleştirmez; ama tek bir siyah kuğu bu önermeyi çürütür.",
      "Bu asimetriden hareketle Popper, bir kuramı bilimsel kılan şeyin doğrulanabilir olması değil, yanlışlanabilir olması olduğunu ileri sürdü. Bilimsel bir kuram, hangi gözlem sonuçlarının kendisini çürüteceğini önceden belirlemeli ve bu çürütme riskine açık olmalıdır. Hiçbir olası gözlemle çelişmeyen, her sonucu kendi lehine yorumlayabilen bir kuram, güçlü görünse de aslında bilgilendirici değildir; çünkü dünya hakkında hiçbir şeyi dışarıda bırakmaz.",
      "Popper bu ölçütü özellikle Einstein'ın genel görelilik kuramı ile bazı psikolojik ve tarihsel kuramlar arasında bir karşıtlık kurmak için kullandı. Einstein'ın kuramı, ışığın Güneş'in çekim alanında sapacağı gibi riskli ve açıkça sınanabilir bir öngörüde bulunuyordu; öngörü gerçekleşmeseydi kuram çürümüş sayılacaktı. Buna karşılık Popper'a göre, olası her davranışı açıklayabilen kuramlar, tam da bu esneklikleri nedeniyle sınanamaz hâle geliyordu.",
      "Yanlışlanabilirlik ilkesi sonraki dönemlerde ciddi eleştirilere uğradı. Thomas Kuhn ve Imre Lakatos gibi düşünürler, bilim insanlarının çelişen bir gözlemle karşılaştıklarında kuramı hemen terk etmediğini, çoğu zaman yardımcı varsayımları değiştirerek kuramı koruduklarını gösterdi. Yine de Popper'ın katkısı, bilimsel eleştirinin ve cesur, sınanabilir önermelerin değerini vurgulaması bakımından, bilim felsefesinde hâlâ temel bir referans noktası olarak kabul edilmektedir.",
    ],
    questions: [
      question(
        "st-popper-falsifiability",
        1,
        "Metindeki kuğu örneği Popper'ın hangi savını göstermektedir?",
        [
          "Sonlu sayıda gözlem evrensel bir önermeyi kesinleştirmez, ama tek bir karşı örnek onu çürütebilir",
          "Kuğuların renginin bilimsel olarak sınıflandırılamayacağını",
          "Gözlemin bilimde hiçbir değeri olmadığını",
          "Tümevarımın mantıksal olarak kesin bir yöntem olduğunu",
        ],
        0
      ),
      question(
        "st-popper-falsifiability",
        2,
        "Popper'a göre bir kuramı bilimsel kılan ölçüt hangisidir?",
        [
          "Çok sayıda gözlemle doğrulanmış olması",
          "Matematiksel bir dille yazılmış olması",
          "Yanlışlanabilir olması",
          "Bilim insanlarının çoğunluğunca kabul edilmesi",
        ],
        2
      ),
      question(
        "st-popper-falsifiability",
        3,
        "Her olası gözlemi kendi lehine yorumlayabilen bir kuram neden bilgilendirici sayılmaz?",
        [
          "Çünkü fazla karmaşık olduğu için anlaşılamaz",
          "Çünkü dünya hakkında hiçbir şeyi dışarıda bırakmaz",
          "Çünkü yeterince eski bir kuram değildir",
          "Çünkü her zaman yanlış çıkar",
        ],
        1
      ),
      question(
        "st-popper-falsifiability",
        4,
        "Kuhn ve Lakatos, yanlışlanabilirlik ilkesine yönelik hangi gözlemde bulunmuştur?",
        [
          "Bilim insanları çelişen her gözlemde kuramı hemen terk eder",
          "Bilimde yanlışlanabilirliğin hiçbir rolü yoktur",
          "Einstein'ın kuramı sınanamaz bir kuramdır",
          "Bilim insanları çoğu zaman yardımcı varsayımları değiştirerek kuramı korur",
        ],
        3
      ),
    ],
  }),
];
