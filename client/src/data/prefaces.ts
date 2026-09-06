/**
 * 可追溯的《毛詩序》資料層。
 * 僅收錄已核對文本；其餘篇目在介面中標示「尚待校訂」，不自動生成內容。
 * 來源：中文維基文庫《詩經》各篇（古典文本為公有領域；頁面內容依 CC BY-SA 4.0）。
 */
export type PrefaceRecord = {
  preface: string;
  page: string;
};

export const prefaces: Record<number, PrefaceRecord> = {
  1: {
    preface:
      "《關雎》，后妃之德也，風之始也，所以風天下而正夫婦也，故用之鄉人焉，用之邦國焉。",
    page: "詩經/關雎",
  },
};
