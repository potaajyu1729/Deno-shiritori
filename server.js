import { serveDir } from "jsr:@std/http/file-server";

// 現在の単語
let previousWord = "しりとり";

// 使用済み単語
let usedWords = [previousWord];

// ゲーム終了フラグ
let gameOver = false;

Deno.serve(async (req) => {
    const pathname = new URL(req.url).pathname;
    console.log(`pathname: ${pathname}`);

    // 現在の単語を取得
    if (req.method === "GET" && pathname === "/shiritori") {
        return new Response(previousWord);
    }

    // リセット
    if (req.method === "POST" && pathname === "/reset") {
        previousWord = "しりとり";
        usedWords = [previousWord];
        gameOver = false;

        return new Response(previousWord);
    }

    // しりとり
    if (req.method === "POST" && pathname === "/shiritori") {

        if (gameOver) {
            return errorResponse(
                "ゲームは終了しています。リセットしてください。",
                "10000",
            );
        }

        const requestJson = await req.json();
        const nextWord = requestJson["nextWord"];

        // ひらがなのみ
        if (!/^[ぁ-んー]+$/.test(nextWord)) {
            return errorResponse(
                "ひらがなのみ入力してください。",
                "10002",
            );
        }

        // 2文字以上
        if (nextWord.length < 2) {
            return errorResponse(
                "2文字以上の単語を入力してください。",
                "10003",
            );
        }

        // 前の単語につながるか
        if (previousWord.slice(-1) !== nextWord.slice(0, 1)) {
            return errorResponse(
                "前の単語に続いていません。",
                "10001",
            );
        }

        // 使用済み単語
        if (usedWords.includes(nextWord)) {
            gameOver = true;
            return errorResponse(
                "同じ単語が入力されたためゲーム終了です。",
                "10004",
            );
        }

        // 「ん」で終了
        if (nextWord.endsWith("ん")) {
            previousWord = nextWord;
            usedWords.push(nextWord);
            gameOver = true;

            return errorResponse(
                "『ん』で終わったためゲーム終了です。",
                "10005",
            );
        }

        previousWord = nextWord;
        usedWords.push(nextWord);

        return new Response(previousWord);
    }

    return serveDir(req, {
        fsRoot: "./public/",
        urlRoot: "",
        enableCors: true,
    });
});

function errorResponse(message, code) {
    return new Response(
        JSON.stringify({
            errorMessage: message,
            errorCode: code,
        }),
        {
            status: 400,
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        },
    );
}