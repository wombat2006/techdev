"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// PDF生成対象ドキュメント設定
const documents = [
    {
        id: 'basic-design',
        input: 'docs/BASIC_DESIGN.md',
        title: 'TechSapo 基本設計書',
        filename: 'TechSapo_基本設計書.pdf'
    },
    {
        id: 'backend-design',
        input: 'docs/BACKEND_DETAILED_DESIGN.md',
        title: 'TechSapo バックエンド詳細設計書',
        filename: 'TechSapo_バックエンド詳細設計書.pdf'
    },
    {
        id: 'interface-spec',
        input: 'docs/INTERFACE_SPECIFICATION.md',
        title: 'TechSapo インターフェース仕様書',
        filename: 'TechSapo_インターフェース仕様書.pdf'
    }
];
// 利用可能なドキュメント一覧を取得
router.get('/documents', (req, res) => {
    try {
        const availableDocs = documents.map(doc => ({
            id: doc.id,
            title: doc.title,
            filename: doc.filename,
            exists: fs_1.default.existsSync(path_1.default.join(process.cwd(), doc.input))
        }));
        res.json({
            success: true,
            documents: availableDocs
        });
    }
    catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({
            success: false,
            error: 'ドキュメント一覧の取得に失敗しました'
        });
    }
});
// ドキュメントのMarkdownコンテンツを取得
router.get('/documents/:id/content', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = documents.find(d => d.id === id);
        if (!doc) {
            return res.status(404).json({
                success: false,
                error: 'ドキュメントが見つかりません'
            });
        }
        const filePath = path_1.default.join(process.cwd(), doc.input);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'ファイルが存在しません'
            });
        }
        const markdownContent = fs_1.default.readFileSync(filePath, 'utf8');
        // Markdown内容を返すのみ（HTML変換はクライアント側で実行）
        res.json({
            success: true,
            document: {
                id: doc.id,
                title: doc.title,
                filename: doc.filename,
                markdownContent: markdownContent
            }
        });
    }
    catch (error) {
        console.error('Error getting document content:', error);
        res.status(500).json({
            success: false,
            error: 'ドキュメント内容の取得に失敗しました'
        });
    }
});
// 生成されたPDFファイル一覧を取得
router.get('/files', (req, res) => {
    try {
        const pdfDir = path_1.default.join(process.cwd(), 'public', 'pdf');
        // PDFディレクトリが存在しない場合は作成
        if (!fs_1.default.existsSync(pdfDir)) {
            fs_1.default.mkdirSync(pdfDir, { recursive: true });
        }
        const files = fs_1.default.readdirSync(pdfDir)
            .filter(file => file.endsWith('.pdf'))
            .map(file => {
            const filePath = path_1.default.join(pdfDir, file);
            const stats = fs_1.default.statSync(filePath);
            return {
                filename: file,
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                url: `/pdf/${file}`
            };
        })
            .sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()); // 新しい順
        res.json({
            success: true,
            files: files,
            totalFiles: files.length
        });
    }
    catch (error) {
        console.error('Error listing PDF files:', error);
        res.status(500).json({
            success: false,
            error: 'PDFファイル一覧の取得に失敗しました'
        });
    }
});
// 特定のPDFファイルの情報を取得
router.get('/files/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(process.cwd(), 'public', 'pdf', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'PDFファイルが見つかりません'
            });
        }
        const stats = fs_1.default.statSync(filePath);
        res.json({
            success: true,
            file: {
                filename: filename,
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                url: `/pdf/${filename}`,
                downloadUrl: `/api/v1/pdf/download/${filename}`
            }
        });
    }
    catch (error) {
        console.error('Error getting PDF file info:', error);
        res.status(500).json({
            success: false,
            error: 'PDFファイル情報の取得に失敗しました'
        });
    }
});
// PDFファイルのダウンロード
router.get('/download/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(process.cwd(), 'public', 'pdf', filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'PDFファイルが見つかりません'
            });
        }
        // ファイル名をURLエンコード
        const encodedFilename = encodeURIComponent(filename);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
        res.setHeader('Content-Length', fs_1.default.statSync(filePath).size);
        const fileStream = fs_1.default.createReadStream(filePath);
        fileStream.pipe(res);
    }
    catch (error) {
        console.error('Error downloading PDF file:', error);
        res.status(500).json({
            success: false,
            error: 'PDFファイルのダウンロードに失敗しました'
        });
    }
});
exports.default = router;
//# sourceMappingURL=pdf-routes.js.map