# Mirror 引入与配置指南

## 1. 当前状态

- Mirror 已导入：`Assets/Mirror/`
- Photon SDK 已移除：`Assets/Photon/` 已删除
- 项目专用 NetworkManager 脚本：`Assets/正式开发项目制作/开发脚本/Mirror/AoyiNetworkManager.cs`
- 旧消息框架桥接：`Assets/正式开发项目制作/开发脚本/Mirror/MirrorNetBridge.cs`
- 局域网快速匹配已接入 Mirror：`Assets/正式开发项目制作/开发脚本/NetWorkScripts/LanDiscovery/LanQuickMatchManager.cs`

当前采用 **方案 A（最小改造）**：保留旧 `MsgFramework` 消息框架与帧同步逻辑，仅把局域网房间的创建/加入/消息广播替换为 Mirror 传输层。

## 2. 方案说明

### 方案 A：最小改造（当前已实施）

- 使用 Mirror 的 `NetworkManager.StartHost()` / `StartClient()` 创建和加入房间。
- 通过 `MirrorNetBridge` 把旧消息（`MsgLoginProf`、`MsgMatchRequest`、`MsgMatchSuccess` 等）编码后承载在 Mirror 消息 `AoyiRawMessage` 上传输。
- 房间发现仍使用自研 UDP Beacon（`LanBeaconSender` / `LanBeaconReceiver`）。
- 战斗场景由每个客户端收到 `MsgMatchSuccess` 后自行加载，保留 `SceneMgr.LoadSceneByName`。
- 战斗同步仍使用内嵌 `EmbeddedUdpServer` + `UDPSocketManager` 的帧同步。

### 方案 B：完全迁移（预留准备）

- 把玩家角色预制体加上 `NetworkIdentity` / `NetworkTransform` 并赋值给 `AoyiNetworkManager.playerPrefab`。
- 将 `MsgPlayerOp` 帧同步逐步替换为 Mirror 的 `NetworkBehaviour` + `[Command]` / `[ClientRpc]` 或 `SyncVar`。
- 房间状态同步改用 `NetworkRoomManager` 或自定义 `NetworkBehaviour`。
- 战斗场景由房主调用 `AoyiNetworkManager.singleton.StartBattle(sceneName)`，通过 `ServerChangeScene` 统一同步加载。
- 移除旧的 `EmbeddedTcpServer` / `EmbeddedUdpServer` / `NetWorkMgr` 等实现。

> 当前代码中已标注 `Plan A / Plan B` 注释的位置，即未来迁移的切入口。

## 3. 关键文件与职责

| 文件 | 职责 |
| --- | --- |
| `Mirror/AoyiNetworkManager.cs` | 项目专用 `NetworkManager`，禁用 `autoCreatePlayer`，注册 `AoyiRawMessage` 处理器，提供 `StartBattle` / `ReturnToLobby` 方法。 |
| `Mirror/MirrorNetBridge.cs` | 旧消息与 Mirror 消息的编解码、服务器端房间状态管理、玩家加入/离开、构造 `MsgMatchSuccess`。 |
| `Mirror/AoyiMirrorMessages.cs` | Mirror 桥接消息定义：`AoyiRawMessage` 承载旧消息二进制数据。 |
| `NetWorkScripts/LanDiscovery/LanQuickMatchManager.cs` | 局域网快速匹配：搜索房间 -> 超时自动创建房间 -> Mirror 开房/进房 -> 广播 `MsgMatchSuccess`。 |
| `NetWorkScripts/LanDiscovery/LanWaitingPanel.cs` | 等待房间 UI，从 `MirrorNetBridge.ServerPlayers` 读取实时玩家数。 |
| `NetWorkScripts/NetWorkMgr.cs` | 旧网络管理器，在 Mirror 激活时通过 `MirrorNetBridge.ClientSend` 发送消息，通过 `DispatchMirrorMessage` 分发收到的消息。 |
| `Battle/Managers/BattleManager.cs` | 战斗管理器，方案 A 下仍由各客户端自行初始化；方案 B 下可接入 Mirror 场景同步事件。 |

## 4. 场景与预制体配置

### AoyiNetworkManager 预制体

1. 在 Unity 中，右键 `Hierarchy` → `Create Empty`，命名为 `AoyiNetworkManager`。
2. 将脚本 `AoyiNetworkManager.cs` 拖到该物体上。
3. 在该物体上添加 `KcpTransport` 组件：
   - `Inspector` 底部点击 `Add Component`
   - 搜索 `Kcp Transport` 并添加
4. 配置 `AoyiNetworkManager`：
   - **Player Prefab**：留空（方案 A 由 `PlayerManager` 本地生成）
   - **Registered Spawnable Prefabs**：留空
   - **Network Address**：`localhost`
   - **Transport Port**：`7777`（运行时由 `LanQuickMatchManager` 动态分配）
5. 从 `Hierarchy` 拖到 `Project` 窗口（例如 `Assets/正式开发项目制作/开发脚本/Mirror/Prefabs/`），创建预制体。
6. 删除 `Hierarchy` 中的实例，`LanQuickMatchManager` 会在运行时自动创建。

### 场景要求

- `LobbyPanel` 场景：无需手动放置 `AoyiNetworkManager`，运行时自动创建。
- `LoadScene` / `CharacterChoose` 等登录/选人场景：同上。
- 战斗场景（`dantiao_map`、`paiwei_map`）：方案 A 下普通场景即可，无需额外 NetworkManager。

## 5. 局域网快速匹配流程

1. 玩家在英雄选择界面点击确认后调用 `LanQuickMatchManager.StartQuickMatch(mode, heroId, skinId)`。
2. 启动 `LanBeaconReceiver` 搜索局域网房间，持续 `searchTimeout` 秒（默认 2.5 秒）。
3. 如果找到兼容房间：
   - 调用 `JoinRoom(room)` 通过 Mirror `StartClient()` 加入。
   - 等待连接就绪后执行 `PerformLanLoginAsync()` 同步服务器分配的 `tempUserId`。
   - 发送 `MsgMatchRequest` 通知英雄选择，进入等待界面。
4. 如果超时未找到房间：
   - 调用 `CreateHostRoom()` 通过 Mirror `StartHost()` 创建主机。
   - 启动内嵌 `EmbeddedUdpServer` 用于战斗帧同步。
   - 启动 `LanBeaconSender` 广播房间信息供其他客户端发现。
   - 房主同样执行登录和匹配请求，进入等待界面。
5. 房主点击开始战斗后调用 `HostStartBattle()`：
   - 检查玩家数 >= 2。
   - 通过 `MirrorNetBridge.ServerBroadcast(msg)` 广播 `MsgMatchSuccess`。
6. 所有客户端收到 `MsgMatchSuccess` 后：
   - 设置自己的 `teamId`。
   - 调用 `GameLoadPanel.LoadGame(playerInfos)` -> `BattleManager.Init(playerInfos)`。
   - 各客户端自行加载战斗场景并初始化战斗系统。

## 6. 测试步骤

### 编辑器内双开测试

1. 确保已关闭代理软件（Clash/V2Ray 等），避免 UDP/TCP 被干扰。
2. 打开 `CharacterChoose` 或 `LobbyPanel` 场景。
3. 使用 ParrelSync 或 Build 一个客户端，与编辑器同时运行。
4. 在两个客户端中分别选择英雄并点击匹配/确认：
   - 先启动的客户端会先搜索房间，超时后自动创建房间并成为房主。
   - 后启动的客户端应能发现房间并加入。
5. 观察 `LanWaitingPanel` 中的玩家数是否正确显示为 `2/2`。
6. 房主点击“开始战斗”，两个客户端应同时加载战斗场景。
7. 检查 Console 中 `[MirrorNetBridge]` / `[LanQuickMatchManager]` / `[BattleManager]` 日志无报错。

### 真机/局域网测试

1. 两台设备连接同一局域网。
2. 确保防火墙允许 Unity 进程通过 UDP/TCP。
3. 一台设备创建房间，另一台搜索加入。
4. 验证 `HostEndpoint` 使用了真实局域网 IP（如 `192.168.x.x`），而非 `127.0.0.1` 或 VPN 虚拟网卡 IP。

## 7. 常见问题排查

| 问题 | 排查方向 |
| --- | --- |
| Mirror StartHost 失败 | 检查端口是否被占用；`LanQuickMatchManager` 会自动尝试 888-908 端口。 |
| 客户端搜索不到房间 | 确认两台设备在同一局域网；关闭代理/VPN；检查 Beacon 端口是否被防火墙拦截。 |
| 客户端加入房间失败 | 检查 `HostEndpoint.TcpIp` 是否为真实局域网 IP；确认 `KcpTransport.Port` 已正确设置。 |
| `LocalPlayerView` 为空 | 确认 `PerformLanLoginAsync()` 成功，服务器分配的 `tempUserId` 已同步到 `PlayerBasicInfoMgr`。 |
| 战斗场景加载后不同步 | 检查 `EmbeddedUdpServer` 是否启动；检查 `ServerConfig.ServerIp` 是否指向主机 IP。 |
| DOTween CanvasGroup 报错 | 确保 Tween 使用了 `.SetLink(target)`，且 `OnDestroy` 中清理了 Tween。 |

## 8. 注意事项

- 不要同时存在多个 `NetworkManager`，否则 Mirror 会报错。`LanQuickMatchManager` 已自动检测并避免重复创建。
- 测试时建议关闭代理软件，避免 UDP/TCP 被重定向或拦截。
- 方案 A 下 `autoCreatePlayer = false`，玩家生成仍由 `PlayerManager` 负责。
- 如需迁移到方案 B，请按注释位置逐步替换，并充分测试战斗同步逻辑。
