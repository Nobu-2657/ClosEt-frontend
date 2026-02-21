// config.js の中身

// 1. 考えられるすべてのURLを「辞書（オブジェクト）」として登録しておく
const ENV = {
  home: 'http://192.168.10.103:3000',    // 自宅用のIP
  univ: 'http://172.16.y.y:3000',     // 大学・研究室用のIP
  prod: 'https://closet-api-1fo7.onrender.com' // 本番（Render）のURL
};

// 2. ★ここで「今いる場所」を1つだけ指定する（ここだけ書き換えればOK！）
// ▼ バックエンドもローカルで開発・テストする時
const CURRENT_LOCAL = 'home'; // または 'univ'

// ▼ アプリの画面だけ開発し、データはRender（本番）と通信させたい時
// const CURRENT_LOCAL = 'prod';

// 3. 自動切り替えのロジック
const config = {
  // 開発中（__DEV__ が true）なら CURRENT_LOCAL で指定したURLを、
  // 本番ビルド後なら自動的に prod のURLを使う
  serverIP: __DEV__ ? ENV[CURRENT_LOCAL] : ENV.prod
};

export default config;