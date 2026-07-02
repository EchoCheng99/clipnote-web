# 剪报本 · Clipnote

从精读到输出的英语练习工具。多用户，每人自己的表达库/练习记录/DeepSeek API Key。

## 一、准备工作(你已经做过的可以跳过)

1. 装 [Node.js](https://nodejs.org)（选 LTS 版本），装完在终端输入 `node -v` 能看到版本号就行
2. 注册 [Supabase](https://supabase.com)（用 GitHub 账号登录最快）
3. 注册 [Vercel](https://vercel.com)（同样支持 GitHub 登录）
4. 有一个 GitHub 账号

## 二、创建 Supabase 项目

1. 登录 Supabase，点 "New project"
2. 起个名字（比如 clipnote），设置一个数据库密码（记下来，但用不太到）
3. 等 1-2 分钟项目建好
4. 左侧菜单进 **SQL Editor**，点 "New query"
5. 打开本项目里的 `supabase-schema.sql` 文件，把内容全部复制粘贴进去，点 **Run**
   （这一步会建好三张表：expressions 表达库 / sessions 练习记录 / user_settings 用户设置，并且设好权限规则）
6. 左侧菜单进 **Project Settings → API**，你会看到两个值：
   - `Project URL`
   - `anon public` 这个 key
   记下来，下一步要用

## 三、本地跑起来

在终端里，进入项目文件夹，依次运行：

```bash
npm install
```

然后复制一份环境变量文件：

```bash
cp .env.local.example .env.local
```

用文本编辑器打开 `.env.local`，把刚才 Supabase 的两个值填进去：

```
NEXT_PUBLIC_SUPABASE_URL=你的Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon public key
```

保存后运行：

```bash
npm run dev
```

终端会显示一个地址，通常是 `http://localhost:3000`，浏览器打开它，应该能看到登录页了。

先自己注册一个账号试试，走一遍：注册 → 设置页填入你的 DeepSeek Key → 表达库贴几条 → 练习页生成场景、写作、批改。

如果 Supabase 后台默认开了邮箱验证，注册后需要去邮箱点确认链接才能登录。如果想跳过这一步方便自己测试，可以在 Supabase 后台 **Authentication → Providers → Email** 里把 "Confirm email" 关掉。

## 四、推到 GitHub

```bash
git init
git add .
git commit -m "first version"
```

去 GitHub 网站新建一个空仓库（不要勾选任何初始化选项），然后按它给的提示运行类似这样的命令：

```bash
git remote add origin 你的仓库地址
git branch -M main
git push -u origin main
```

## 五、部署到 Vercel

1. 登录 Vercel，点 "Add New" → "Project"
2. 选择刚才推上去的 GitHub 仓库，点 Import
3. 在 "Environment Variables" 里填入和 `.env.local` 一样的两个值：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 点 Deploy，等一两分钟

部署完成后 Vercel 会给你一个网址（形如 `your-app.vercel.app`），这就是可以发给朋友的正式地址了。以后你在本地改代码、`git push`，Vercel 会自动重新部署。

## 六、给朋友用

朋友打开网址后：注册账号 → 进"设置"填自己的 DeepSeek API Key（去 platform.deepseek.com 申请）→ 就能正常用了。所有人的数据完全独立，互相看不到。
