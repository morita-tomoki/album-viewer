# app.py
import os
from flask import Flask, render_template, jsonify, request, send_from_directory, abort
from flask_sqlalchemy import SQLAlchemy
from flask_caching import Cache

from dotenv import load_dotenv

from sqlalchemy.exc import SQLAlchemyError

# .envファイルの内容を読み込む
load_dotenv()

app = Flask(__name__)

# 環境変数や設定ファイルでDB接続文字列を管理
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://app_user:your_password@localhost/your_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['CACHE_TYPE'] = 'simple'  # 簡易キャッシュ
app.config['CACHE_DEFAULT_TIMEOUT'] = 300

db = SQLAlchemy(app)
cache = Cache(app)

# モデル定義
class FacebookAlbum(db.Model):
    __tablename__ = 'facebook_albums'
    id = db.Column(db.Integer, primary_key=True)
    album_name = db.Column(db.Text, nullable=False)
    album_url = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)
    facebook_album_id = db.Column(db.BigInteger, nullable=False)
    photo_count = db.Column(db.Integer, nullable=False)
    video_count = db.Column(db.Integer, nullable=False)

class FacebookAlbumImage(db.Model):
    __tablename__ = 'facebook_album_images'
    id = db.Column(db.Integer, primary_key=True)
    album_id = db.Column(db.Integer, db.ForeignKey('facebook_albums.id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.Text, nullable=False)
    local_file_path = db.Column(db.Text)
    created_at = db.Column(db.DateTime)
    updated_at = db.Column(db.DateTime)
    facebook_photo_id = db.Column(db.BigInteger, nullable=False)
    is_downloaded = db.Column(db.Boolean, nullable=False, default=False)
    course_id = db.Column(db.Integer, nullable=False, default=0)

# エラーハンドリングの例
@app.errorhandler(SQLAlchemyError)
def handle_db_error(e):
    db.session.rollback()
    return jsonify(error=str(e)), 500


@app.route('/')
def index():
    # templates/index.html を返す
    return render_template('index.html')

# アルバム一覧取得（ページネーション対応例）
@app.route('/api/albums', methods=['GET'])
@cache.cached(timeout=300, query_string=True)
def get_albums():
    try:
        # ページネーションパラメータ
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 900, type=int)
        pagination = (FacebookAlbum.query
                      .order_by(FacebookAlbum.id.desc())
                      .paginate(page=page, per_page=per_page, error_out=False)
        )
        albums = [{
            'id': album.id,
            'album_name': album.album_name,
            'album_url': album.album_url,
            'description': album.description,
            'photo_count': album.photo_count,
            'video_count': album.video_count
        } for album in pagination.items]
        return jsonify({
            'albums': albums,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page
        })
    except Exception as e:
        return jsonify(error=str(e)), 500

# 指定アルバム内の画像一覧取得（ページネーション対応例）
@app.route('/api/albums/<int:album_id>/images', methods=['GET'])
def get_album_images(album_id):
    try:
        # ページネーションパラメータ
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 400, type=int)
        course_id = request.args.get('course_id', type=int)

        query = FacebookAlbumImage.query.filter_by(album_id=album_id)

        # course_id が指定されている場合にのみフィルター
        # 0 の場合は「全コースを表示」とみなす
        # 999 の場合は「未分類のみ」を表示
        if course_id == 999:
            query = query.filter_by(course_id=999)
        elif course_id is not None and course_id != 0:
            query = query.filter_by(course_id=course_id)

        # ここで 'query' に対してページネーションを適用
        pagination = (query
            .order_by(FacebookAlbumImage.id.asc())
            .paginate(page=page, per_page=per_page, error_out=False)
        )

        images = [{
            'id': image.id,
            'image_url': image.image_url,
            'local_file_path': image.local_file_path,
            'is_downloaded': image.is_downloaded,
            'course_id': image.course_id
        } for image in pagination.items]
        return jsonify({
            'images': images,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page
        })
    except Exception as e:
        return jsonify(error=str(e)), 500

@app.route('/images/<path:filename>')
def serve_image(filename):
    # 基本の画像ディレクトリ（DBに保存しているパスの共通部分）
    base_dir = '/home/tomoki/Projects/kakotensaku/images/original'
    # セキュリティ対策として、ファイルパスの正当性をチェックすることが重要です
    if not os.path.isfile(os.path.join(base_dir, filename)):
        print('Invalid file path:', os.path.join(base_dir, filename))
        abort(404)
    return send_from_directory(base_dir, filename)

if __name__ == '__main__':
    # 初期テーブル作成（必要に応じて）
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
