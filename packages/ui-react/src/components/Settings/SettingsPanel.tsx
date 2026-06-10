import React, { useState, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { USER_COLORS } from '../../types';

const TABS = [
  { id: 'general', label: '一般' },
  { id: 'user', label: 'ユーザー' },
  { id: 'editor', label: 'エディタ' },
  { id: 'preview', label: 'プレビュー' },
  { id: 'backup', label: 'バックアップ' },
  { id: 'about', label: 'このアプリ' },
];

function SettingsPanel() {
  const {
    settings,
    updateSettings,
    resetSettings,
    closeSettings,
    exportSettings,
    importSettings,
    checkForUpdates,
    updateInfo,
    isCheckingUpdate,
    appVersion,
    githubRepo,
    // 自動アップデート
    updateStatus,
    isDownloading,
    downloadProgress,
    downloadUrl,
    downloadUpdate,
    installUpdate,
    isElectronApp,
    // ユーザー管理
    users,
    currentUser,
    currentUserId,
    addUser,
    removeUser,
    switchUser,
    updateUserName,
    updateUserColor,
  } = useSettings();

  // 新規ユーザー追加フォーム
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserColor, setNewUserColor] = useState<(typeof USER_COLORS)[number]>(USER_COLORS[0]);

  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importSettings((event.target?.result as string) ?? '');
      if (!result.success) {
        alert('設定のインポートに失敗しました: ' + result.error);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="settings-overlay" onClick={closeSettings}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>設定</h2>
          <button className="close-btn" onClick={closeSettings}>×</button>
        </div>

        <div className="settings-body">
          <div className="settings-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-content">
            {activeTab === 'general' && (
              <div className="settings-section">
                <h3>ファイル表示</h3>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="showHiddenFiles"
                    checked={settings.files.showHiddenFiles}
                    onChange={(e) => updateSettings('files.showHiddenFiles', e.target.checked)}
                  />
                  <label htmlFor="showHiddenFiles">隠しファイルを表示</label>
                </div>

                <h3>テーマ</h3>
                <div className="setting-item">
                  <label>カラーテーマ</label>
                  <select
                    value={settings.ui.theme}
                    onChange={(e) => updateSettings('ui.theme', e.target.value)}
                  >
                    <option value="dark">ダーク</option>
                    <option value="light">ライト</option>
                  </select>
                </div>

                <h3>データ管理</h3>
                <div className="setting-item buttons-row">
                  <button className="action-btn" onClick={exportSettings}>
                    📤 設定をエクスポート
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📥 設定をインポート
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </div>
                <div className="setting-item">
                  <button className="action-btn danger" onClick={() => {
                    if (confirm('すべての設定をデフォルトに戻しますか？')) {
                      resetSettings();
                    }
                  }}>
                    🔄 設定をリセット
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="settings-section">
                <h3>エディタ設定</h3>
                <div className="setting-item">
                  <label>フォントサイズ</label>
                  <input
                    type="number"
                    min="10"
                    max="24"
                    value={settings.editor.fontSize}
                    onChange={(e) => updateSettings('editor.fontSize', parseInt(e.target.value))}
                  />
                </div>
                <div className="setting-item">
                  <label>タブサイズ</label>
                  <select
                    value={settings.editor.tabSize}
                    onChange={(e) => updateSettings('editor.tabSize', parseInt(e.target.value))}
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </div>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="wordWrap"
                    checked={settings.editor.wordWrap}
                    onChange={(e) => updateSettings('editor.wordWrap', e.target.checked)}
                  />
                  <label htmlFor="wordWrap">行の折り返し</label>
                </div>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="lineNumbers"
                    checked={settings.editor.lineNumbers}
                    onChange={(e) => updateSettings('editor.lineNumbers', e.target.checked)}
                  />
                  <label htmlFor="lineNumbers">行番号を表示</label>
                </div>

                <h3>自動保存</h3>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="autoSave"
                    checked={settings.editor.autoSave}
                    onChange={(e) => updateSettings('editor.autoSave', e.target.checked)}
                  />
                  <label htmlFor="autoSave">自動保存を有効化</label>
                </div>
                {settings.editor.autoSave && (
                  <div className="setting-item">
                    <label>自動保存間隔（秒）</label>
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={settings.editor.autoSaveInterval / 1000}
                      onChange={(e) => updateSettings('editor.autoSaveInterval', parseInt(e.target.value) * 1000)}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'preview' && (
              <div className="settings-section">
                <h3>プレビュー設定</h3>
                <div className="setting-item">
                  <label>フォントサイズ</label>
                  <input
                    type="number"
                    min="12"
                    max="24"
                    value={settings.preview.fontSize}
                    onChange={(e) => updateSettings('preview.fontSize', parseInt(e.target.value))}
                  />
                </div>
                <div className="setting-item">
                  <label>行間</label>
                  <select
                    value={settings.preview.lineHeight}
                    onChange={(e) => updateSettings('preview.lineHeight', parseFloat(e.target.value))}
                  >
                    <option value={1.4}>コンパクト (1.4)</option>
                    <option value={1.6}>標準 (1.6)</option>
                    <option value={1.8}>ゆったり (1.8)</option>
                    <option value={2.0}>広め (2.0)</option>
                  </select>
                </div>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="showAnnotationSidebar"
                    checked={settings.preview.showAnnotationSidebar}
                    onChange={(e) => updateSettings('preview.showAnnotationSidebar', e.target.checked)}
                  />
                  <label htmlFor="showAnnotationSidebar">注釈サイドバーを表示</label>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="settings-section">
                <h3>バックアップ設定</h3>
                <div className="setting-item checkbox">
                  <input
                    type="checkbox"
                    id="backupEnabled"
                    checked={settings.backup.enabled}
                    onChange={(e) => updateSettings('backup.enabled', e.target.checked)}
                  />
                  <label htmlFor="backupEnabled">バックアップを有効化</label>
                </div>
                {settings.backup.enabled && (
                  <>
                    <div className="setting-item checkbox">
                      <input
                        type="checkbox"
                        id="autoBackupOnSave"
                        checked={settings.backup.autoBackupOnSave}
                        onChange={(e) => updateSettings('backup.autoBackupOnSave', e.target.checked)}
                      />
                      <label htmlFor="autoBackupOnSave">保存時に自動バックアップ</label>
                    </div>
                    <div className="setting-item">
                      <label>最大バックアップ数</label>
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={settings.backup.maxBackups}
                        onChange={(e) => updateSettings('backup.maxBackups', parseInt(e.target.value))}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'user' && (
              <div className="settings-section">
                <h3>現在のユーザー</h3>
                <div className="current-user-info">
                  <div
                    className="user-avatar"
                    style={{ backgroundColor: currentUser?.color || USER_COLORS[0] }}
                  >
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="user-details">
                    <span className="user-name">{currentUser?.name || 'ユーザー'}</span>
                    <span className="user-badge">現在のユーザー</span>
                  </div>
                </div>

                <div className="setting-item">
                  <label>表示名</label>
                  <input
                    type="text"
                    value={currentUser?.name || ''}
                    onChange={(e) => updateUserName(e.target.value)}
                    placeholder="名前を入力"
                  />
                </div>

                <div className="setting-item">
                  <label>ハイライトカラー</label>
                  <div className="color-picker">
                    {USER_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`color-option ${currentUser?.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateUserColor(color)}
                        title={color}
                      >
                        {currentUser?.color === color && <span className="check-icon">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <h3>チームメンバー</h3>
                <div className="users-list">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`user-item ${user.id === currentUserId ? 'current' : ''}`}
                    >
                      <button
                        className="user-item-main"
                        onClick={() => user.id !== currentUserId && switchUser(user.id)}
                        disabled={user.id === currentUserId}
                      >
                        <div
                          className="user-avatar small"
                          style={{ backgroundColor: user.color }}
                        >
                          {user.name.charAt(0)}
                        </div>
                        <span className="user-name">{user.name}</span>
                        {user.id === currentUserId && (
                          <span className="user-badge small">現在</span>
                        )}
                      </button>
                      {user.id !== currentUserId && users.length > 1 && (
                        <button
                          className="user-remove-btn"
                          onClick={() => removeUser(user.id)}
                          title={`${user.name}を削除`}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {showAddUser ? (
                  <div className="add-user-form">
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="ユーザー名"
                      autoFocus
                    />
                    <div className="add-user-colors">
                      {USER_COLORS.slice(0, 4).map((color) => (
                        <button
                          key={color}
                          className={`color-option small ${newUserColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewUserColor(color)}
                        >
                          {newUserColor === color && <span className="check-icon">✓</span>}
                        </button>
                      ))}
                    </div>
                    <div className="add-user-actions">
                      <button
                        className="action-btn"
                        onClick={() => {
                          setShowAddUser(false);
                          setNewUserName('');
                          setNewUserColor(USER_COLORS[0]);
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        className="action-btn primary"
                        onClick={() => {
                          if (newUserName.trim()) {
                            addUser(newUserName.trim(), newUserColor);
                            setShowAddUser(false);
                            setNewUserName('');
                            setNewUserColor(USER_COLORS[0]);
                          }
                        }}
                        disabled={!newUserName.trim()}
                      >
                        追加
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="action-btn add-user-btn"
                    onClick={() => setShowAddUser(true)}
                  >
                    ＋ メンバーを追加
                  </button>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="settings-section">
                <h3>アップデート</h3>
                <div className="update-section">
                  <div className="current-version">
                    <span>現在のバージョン</span>
                    <span className="version-number">v{appVersion}</span>
                  </div>

                  {/* アップデート確認ボタン */}
                  {!isDownloading && updateStatus !== 'downloaded' && (
                    <button
                      className="action-btn update-btn"
                      onClick={checkForUpdates}
                      disabled={isCheckingUpdate || !isElectronApp}
                    >
                      {isCheckingUpdate ? '確認中...' : '🔄 アップデートを確認'}
                    </button>
                  )}

                  {/* ダウンロード進捗 */}
                  {isDownloading && (
                    <div className="download-progress">
                      <p className="update-message">ダウンロード中...</p>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <p className="progress-text">{Math.round(downloadProgress)}%</p>
                    </div>
                  )}

                  {/* アップデート結果表示 */}
                  {updateInfo && !isDownloading && (
                    <div className={`update-result ${updateInfo.hasUpdate ? 'has-update' : updateInfo.error ? 'has-error' : 'up-to-date'}`}>
                      {updateInfo.error ? (
                        <p className="update-message error-message">{updateInfo.error}</p>
                      ) : updateInfo.hasUpdate ? (
                        <>
                          <p className="update-message">新しいバージョンがあります！</p>
                          <p className="update-version">v{updateInfo.latestVersion}</p>
                          {updateStatus === 'downloaded' ? (
                            <button
                              className="action-btn primary install-btn"
                              onClick={installUpdate}
                            >
                              🚀 インストールして再起動
                            </button>
                          ) : downloadUrl ? (
                            <button
                              className="action-btn primary download-btn"
                              onClick={downloadUpdate}
                            >
                              ⬇ ダウンロード
                            </button>
                          ) : (
                            <button
                              className="action-btn primary download-btn"
                              onClick={() => {
                                const releaseUrl = updateInfo?.releaseUrl;
                                if (releaseUrl) {
                                  window.open(releaseUrl, '_blank');
                                } else {
                                  window.open(`https://github.com/${githubRepo}/releases/latest`, '_blank');
                                }
                              }}
                            >
                              🔗 GitHub リリースページを開く
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="update-message">最新バージョンです</p>
                      )}
                    </div>
                  )}

                  {!isElectronApp && (
                    <p className="update-note">※ 自動アップデートはデスクトップアプリでのみ利用可能です</p>
                  )}
                </div>

                <h3>アプリ情報</h3>
                <div className="build-info">
                  <div className="info-row">
                    <span>バージョン:</span>
                    <span>v{appVersion}</span>
                  </div>
                  <div className="info-row">
                    <span>Electron:</span>
                    <span>28.3.3</span>
                  </div>
                  <div className="info-row">
                    <span>React:</span>
                    <span>18.2.0</span>
                  </div>
                </div>

                <h3>リンク</h3>
                <div className="link-buttons">
                  <button
                    className="action-btn"
                    onClick={() => window.open(`https://github.com/${githubRepo}`, '_blank')}
                  >
                    GitHub リポジトリ
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => window.open(`https://github.com/${githubRepo}/releases`, '_blank')}
                  >
                    リリース一覧
                  </button>
                  <button
                    className="action-btn"
                    onClick={() => window.open(`https://github.com/${githubRepo}/issues`, '_blank')}
                  >
                    バグ報告・要望
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .settings-modal {
            width: 90%;
            max-width: 700px;
            max-height: 85vh;
            background-color: var(--bg-secondary);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }

          .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background-color: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-color);
          }

          .settings-header h2 {
            margin: 0;
            font-size: 18px;
            color: var(--text-primary);
          }

          .close-btn {
            width: 32px;
            height: 32px;
            border-radius: 6px;
            font-size: 18px;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .close-btn:hover {
            background-color: var(--bg-hover);
            color: var(--text-primary);
          }

          .settings-body {
            display: flex;
            height: calc(85vh - 60px);
          }

          .settings-tabs {
            width: 150px;
            flex-shrink: 0;
            background-color: var(--bg-tertiary);
            border-right: 1px solid var(--border-color);
            padding: 8px;
          }

          .settings-tab {
            width: 100%;
            padding: 10px 12px;
            text-align: left;
            font-size: 13px;
            color: var(--text-secondary);
            border-radius: 6px;
            margin-bottom: 4px;
          }

          .settings-tab:hover {
            background-color: var(--bg-hover);
            color: var(--text-primary);
          }

          .settings-tab.active {
            background-color: var(--accent-color);
            color: white;
          }

          .settings-content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }

          .settings-section h3 {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border-color);
          }

          .settings-section h3:not(:first-child) {
            margin-top: 24px;
          }

          .setting-item {
            margin-bottom: 16px;
          }

          .setting-item label {
            display: block;
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 6px;
          }

          .setting-item input[type="number"],
          .setting-item select {
            width: 100%;
            padding: 8px 12px;
            background-color: var(--bg-tertiary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 13px;
          }

          .setting-item input[type="number"]:focus,
          .setting-item select:focus {
            outline: none;
            border-color: var(--accent-color);
          }

          .setting-item.checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .setting-item.checkbox label {
            margin: 0;
            cursor: pointer;
          }

          .setting-item.checkbox input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          .setting-hint {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 8px;
          }

          .buttons-row {
            display: flex;
            gap: 8px;
          }

          .action-btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 13px;
            background-color: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            transition: all 0.2s;
          }

          .action-btn:hover {
            background-color: var(--bg-hover);
            border-color: var(--accent-color);
          }

          .action-btn.danger {
            color: var(--error-color);
          }

          .action-btn.danger:hover {
            background-color: rgba(244, 67, 54, 0.1);
            border-color: var(--error-color);
          }

          .section-warning {
            font-size: 12px;
            color: var(--warning-color);
            background-color: rgba(255, 193, 7, 0.1);
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 16px;
          }

          .build-info {
            background-color: var(--bg-tertiary);
            border-radius: 8px;
            padding: 12px;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 12px;
            color: var(--text-secondary);
          }

          .info-row:not(:last-child) {
            border-bottom: 1px solid var(--border-color);
          }

          .update-section {
            background-color: var(--bg-tertiary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
          }

          .current-version {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 13px;
          }

          .version-number {
            font-weight: 600;
            color: var(--accent-color);
          }

          .update-btn {
            width: 100%;
            margin-bottom: 12px;
          }

          .update-result {
            padding: 12px;
            border-radius: 6px;
            text-align: center;
          }

          .update-result.has-update {
            background-color: rgba(0, 120, 212, 0.15);
            border: 1px solid var(--accent-color);
          }

          .update-result.up-to-date {
            background-color: rgba(76, 175, 80, 0.15);
            border: 1px solid #4caf50;
          }

          .update-message {
            font-size: 13px;
            color: var(--text-primary);
            margin: 0 0 4px 0;
          }

          .update-version {
            font-size: 18px;
            font-weight: 700;
            color: var(--accent-color);
            margin: 8px 0;
          }

          .download-link {
            display: inline-block;
            padding: 8px 16px;
            background-color: var(--accent-color);
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-size: 13px;
            margin-top: 8px;
            cursor: pointer;
          }

          .download-link:hover {
            background-color: var(--accent-hover);
          }

          .link-buttons {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .link-buttons .action-btn {
            text-align: center;
          }

          /* Download Progress Styles */
          .download-progress {
            padding: 12px;
            background-color: rgba(0, 120, 212, 0.1);
            border-radius: 6px;
            text-align: center;
            margin-bottom: 12px;
          }

          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--bg-tertiary);
            border-radius: 4px;
            overflow: hidden;
            margin: 12px 0;
          }

          .progress-fill {
            height: 100%;
            background-color: var(--accent-color);
            border-radius: 4px;
            transition: width 0.3s ease;
          }

          .progress-text {
            font-size: 12px;
            color: var(--text-secondary);
            margin: 4px 0 0 0;
          }

          .update-result.has-error {
            background-color: rgba(244, 67, 54, 0.15);
            border: 1px solid var(--error-color);
          }

          .error-message {
            color: var(--error-color);
          }

          .download-btn, .install-btn {
            width: 100%;
            margin-top: 12px;
            padding: 12px 16px;
            font-size: 14px;
            font-weight: 600;
          }

          .update-note {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 12px;
            text-align: center;
          }

          /* User Management Styles */
          .current-user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background-color: var(--bg-tertiary);
            border-radius: 8px;
            margin-bottom: 16px;
          }

          .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 18px;
          }

          .user-avatar.small {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }

          .user-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .user-details .user-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
          }

          .user-badge {
            font-size: 11px;
            padding: 2px 8px;
            background-color: var(--accent-color);
            color: white;
            border-radius: 10px;
            width: fit-content;
          }

          .user-badge.small {
            font-size: 10px;
            padding: 1px 6px;
          }

          .color-picker {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .color-option {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .color-option:hover {
            transform: scale(1.1);
          }

          .color-option.selected {
            border-color: white;
            box-shadow: 0 0 0 2px var(--accent-color);
          }

          .color-option.small {
            width: 24px;
            height: 24px;
          }

          .check-icon {
            color: white;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          }

          .users-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
          }

          .user-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background-color: var(--bg-tertiary);
            border-radius: 8px;
            transition: background-color 0.2s;
          }

          .user-item:hover {
            background-color: var(--bg-hover);
          }

          .user-item.current {
            background-color: rgba(0, 120, 212, 0.15);
            border: 1px solid var(--accent-color);
          }

          .user-item-main {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 10px;
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 13px;
          }

          .user-item-main:disabled {
            cursor: default;
          }

          .user-item-main .user-name {
            flex: 1;
            text-align: left;
          }

          .user-remove-btn {
            width: 28px;
            height: 28px;
            border-radius: 4px;
            background: none;
            border: none;
            cursor: pointer;
            opacity: 0.5;
            transition: all 0.2s;
            font-size: 12px;
          }

          .user-remove-btn:hover {
            opacity: 1;
            background-color: rgba(244, 67, 54, 0.1);
          }

          .add-user-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            background-color: var(--bg-tertiary);
            border-radius: 8px;
          }

          .add-user-form input {
            width: 100%;
            padding: 8px 12px;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 13px;
          }

          .add-user-form input:focus {
            outline: none;
            border-color: var(--accent-color);
          }

          .add-user-colors {
            display: flex;
            gap: 8px;
          }

          .add-user-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
          }

          .add-user-btn {
            width: 100%;
            justify-content: center;
          }

          .action-btn.primary {
            background-color: var(--accent-color);
            border-color: var(--accent-color);
            color: white;
          }

          .action-btn.primary:hover {
            background-color: var(--accent-hover);
          }

          .action-btn.primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

export default SettingsPanel;
