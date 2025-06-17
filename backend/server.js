import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// セキュリティとパフォーマンスのミドルウェア
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS設定
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://journey-ai.onrender.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// リクエスト制限
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api', limiter);

// 特別制限（AI API用）
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 10, // 最大10リクエスト
  message: {
    error: 'Too many AI requests, please try again in a moment.'
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Gemini AIの初期化
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.warn('GEMINI_API_KEY not found. AI suggestions will not work.');
}

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 移動時間計算関数
function calculateTravelTime(departure, arrival) {
  if (!departure || !arrival) return null;
  
  const [depHour, depMin] = departure.split(':').map(Number);
  const [arrHour, arrMin] = arrival.split(':').map(Number);
  
  let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);
  if (totalMinutes < 0) totalMinutes += 24 * 60; // 次の日の場合
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return { hours, minutes, totalMinutes };
}

// プロンプト生成関数
function generatePrompt(data, travelTime) {
  const { departure, destination, departureTime, arrivalTime, mood, suggestionStyle } = data;
  
  let stylePrompt = '';
  
  switch(suggestionStyle) {
    case 'safe':
      stylePrompt = `
安全で確実な定番の提案をしてください：
- 有名で評価の高い観光スポット
- 営業時間が確実で、アクセスしやすい場所
- 一般的にお勧めされている体験
- 失敗のリスクが低い選択肢
- 初心者でも楽しめる安心できる場所
`;
      break;
      
    case 'creative':
      stylePrompt = `
クリエイティブで意外性のある提案をしてください：
- 地元の人しか知らない隠れスポット
- 常識を破るユニークな体験
- 一風変わった文化的体験
- SNSでは見つからない特別な場所
- 参加型・体験型の活動
- 少しの冒険心が必要な提案
- 記憶に残る特別な体験
- 従来の観光とは一線を画した体験
`;
      break;
      
    case 'balanced':
    default:
      stylePrompt = `
定番とユニークのバランスの取れた提案をしてください：
- 安全だが少し特別感のある体験
- 地元色豊かだが アクセスしやすい場所
- 観光客向けではない地元の良いスポット
- 適度な新鮮さと安心感を両立
- 少し知る人ぞ知るスポット
`;
      break;
  }
  
  return `
以下の情報に基づいて、最適な旅程を提案してください：

出発地: ${departure}
目的地: ${destination}
出発時刻: ${departureTime}
到着希望時刻: ${arrivalTime}
利用可能時間: ${travelTime.hours}時間${travelTime.minutes}分
気分: ${mood.join(', ')}

${stylePrompt}

条件：
1. 実在する場所やスポットを提案する
2. 移動時間も考慮する（電車や徒歩での移動時間を含む）
3. 選択された気分に合致する活動
4. 時間内に完了可能な内容
5. 具体的な住所と説明を含める
6. 現実的で実行可能な提案
7. 季節や天候を考慮した提案

JSON形式で出力してください：
{
  "suggestions": [
    {
      "type": "カテゴリー",
      "name": "スポット名",
      "duration": "所要時間",
      "description": "魅力的で具体的な説明（100文字程度）",
      "address": "具体的な住所",
      "coordinates": {"lat": 緯度, "lng": 経度},
      "tips": "実際に行く際のコツやアドバイス（オプション）"
    }
  ]
}
`;
}

// バリデーションルール
const suggestionValidation = [
  body('departure').trim().notEmpty().withMessage('出発地は必須です'),
  body('destination').trim().notEmpty().withMessage('目的地は必須です'),
  body('departureTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('正しい出発時刻を入力してください'),
  body('arrivalTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('正しい到着時刻を入力してください'),
  body('mood').isArray({ min: 1 }).withMessage('気分を少なくとも1つ選択してください'),
  body('suggestionStyle').isIn(['safe', 'balanced', 'creative']).withMessage('正しい提案スタイルを選択してください')
];

// AI提案生成エンドポイント
app.post('/api/generate-suggestions', aiLimiter, suggestionValidation, async (req, res) => {
  try {
    // バリデーションエラーチェック
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { departure, destination, departureTime, arrivalTime, mood, suggestionStyle } = req.body;
    
    // 移動時間を計算
    const travelTime = calculateTravelTime(departureTime, arrivalTime);
    
    if (!travelTime || travelTime.totalMinutes < 0) {
      return res.status(400).json({
        success: false,
        error: '到着時刻が出発時刻より前になっています'
      });
    }

    let suggestions;

    // Gemini APIが利用可能な場合
    if (genAI) {
      try {
        const prompt = generatePrompt(req.body, travelTime);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // JSONレスポンスをパースして返す
        const aiSuggestions = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
        
        suggestions = {
          travelTime,
          route: `${departure} → ${destination}`,
          style: suggestionStyle,
          ...aiSuggestions
        };
        
      } catch (aiError) {
        console.error('AI API Error:', aiError);
        // AI APIエラーの場合はフォールバックを使用
        suggestions = generateFallbackSuggestions(req.body, travelTime);
      }
    } else {
      // Gemini APIが利用できない場合はフォールバック
      suggestions = generateFallbackSuggestions(req.body, travelTime);
    }
    
    res.json({
      success: true,
      data: suggestions
    });
    
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error'
    });
  }
});

// フォールバック提案生成関数
function generateFallbackSuggestions(data, travelTime) {
  const { departure, destination, mood, suggestionStyle } = data;
  const suggestions = [];

  // 基本的なフォールバック提案
  if (travelTime.totalMinutes > 60) {
    if (mood.includes('cultural')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '隠れ文化スポット' : '文化スポット',
        name: suggestionStyle === 'creative' ? '地域の隠れた歴史スポット' : '地域の博物館・美術館',
        duration: '60分',
        description: suggestionStyle === 'creative' 
          ? '観光ガイドには載っていない地元の歴史的な場所や建物を探索'
          : '地域の歴史と文化に触れることができる博物館や美術館',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('foodie')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '秘密グルメ' : 'グルメ',
        name: suggestionStyle === 'creative' ? '地元民だけが知る隠れ名店' : '地域の人気レストラン',
        duration: '90分',
        description: suggestionStyle === 'creative'
          ? '看板も小さく、地元の常連客だけが通う本当の名店での食事体験'
          : '地元で愛される老舗レストランで季節の料理を楽しむ',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('relaxed')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '秘密の癒しスポット' : 'リラックス',
        name: suggestionStyle === 'creative' ? '都市の中の隠れた自然スポット' : '公園でのんびり散歩',
        duration: '45分',
        description: suggestionStyle === 'creative'
          ? 'ビルの谷間にある小さな庭園や、知る人ぞ知る静寂の場所でのリラックス'
          : '美しい自然に囲まれた公園でゆっくりと散歩を楽しむ',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('adventurous')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '都市探検' : '冒険スポット',
        name: suggestionStyle === 'creative' ? '地下街の迷宮巡り' : '展望台からの景色',
        duration: '60分',
        description: suggestionStyle === 'creative'
          ? '地下街で意図的に迷子になる冒険。隠された通路や秘密の店を発見'
          : '高層ビルの展望台から街を一望し、新しい視点を得る',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('shopping')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '謎解きショッピング' : 'ショッピング',
        name: suggestionStyle === 'creative' ? '商店街の七不思議巡り' : '地元の商店街散策',
        duration: '80分',
        description: suggestionStyle === 'creative'
          ? '地元の商店街に隠された謎を解きながらのユニークなショッピング体験'
          : '個性的なお店が並ぶ商店街でお土産探しを楽しむ',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('photo')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? 'アングラ撮影' : 'フォトスポット',
        name: suggestionStyle === 'creative' ? '消えゆく職人技の記録撮影' : 'インスタ映えスポット巡り',
        duration: '60分',
        description: suggestionStyle === 'creative'
          ? '伝統工芸の職人技を撮影する貴重な体験。デジタル時代に失われつつある技術を記録'
          : '人気のフォトスポットで思い出の写真を撮影',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }

    if (mood.includes('music')) {
      suggestions.push({
        type: suggestionStyle === 'creative' ? '音楽探求' : '音楽スポット',
        name: suggestionStyle === 'creative' ? '路上ミュージシャンとのセッション' : 'レコードショップ巡り',
        duration: '50分',
        description: suggestionStyle === 'creative'
          ? '偶然出会った路上ミュージシャンとの即興セッション体験'
          : 'こだわりのレコードショップで音楽の宝探し',
        address: `${departure}と${destination}の間のエリア`,
        coordinates: { lat: 35.6762, lng: 139.6503 }
      });
    }
  }

  // 時間が短い場合の提案
  if (suggestions.length === 0) {
    suggestions.push({
      type: '移動時間活用',
      name: '移動中の特別体験',
      duration: `${travelTime.minutes}分`,
      description: '限られた時間を有効活用する移動中の楽しみ方を提案',
      address: '移動ルート上',
      coordinates: { lat: 35.6762, lng: 139.6503 }
    });
  }

  return {
    travelTime,
    route: `${departure} → ${destination}`,
    style: suggestionStyle,
    suggestions
  };
}

// 404ハンドラー
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// エラーハンドラー
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Journey AI Backend Server is running!
📡 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🤖 Gemini AI: ${genAI ? '✅ Connected' : '❌ Not configured'}
📅 Started: ${new Date().toISOString()}
  `);
});