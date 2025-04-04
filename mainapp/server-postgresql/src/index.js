import fs from "fs";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import https from "https";

const SSL_KEY_PATH = "./src/ssl/localhost-key.pem";
const SSL_CERT_PATH = "./src/ssl/localhost.pem";

const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH),
};

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.post('/auth/register', async (req, res) => {
  const { username, email, password, age, bio, avatar, role } = req.body;

  if (!username || !email || !password || !age) {
    return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
  }

  try {
    const ageInt = parseInt(age, 10);

    if (isNaN(ageInt)) {
      return res.status(400).json({ error: 'Возраст должен быть целым числом' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    const existingUsernameUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsernameUser) {
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }


    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        age: ageInt,  
        bio,         
        avatar,    
        role: role || 'USER',
      },
    });

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        age: newUser.age,
        bio: newUser.bio,
        avatar: newUser.avatar,
        role: newUser.role
      },
    });
  } catch (error) {
    console.error('Ошибка регистрации пользователя:', error);  
    res.status(500).json({ error: 'Ошибка при регистрации пользователя' });
  }
});

app.post('/stats/calls', async (req, res) => {
  const { roomId, userId, startTime, endTime, duration } = req.body; 

  try {
    const call = await prisma.call.create({
      data: {
        roomId: roomId,
        userId: userId, 
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: duration,
      },
    });

    console.log('Call statistics saved successfully');
    res.status(201).json({ message: 'Call statistics saved successfully', call });
  } catch (error) {
    console.error('Error saving call statistics:', error);
    res.status(500).json({ error: 'Ошибка при сохранении статистики звонков' });
  }
});

app.get('/stats/calls', async (req, res) => {
  const { roomId } = req.query; 
  try {
    const stats = await prisma.call.findMany({
      where: {
        roomId: roomId, 
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const formattedStats = stats.map(stat => ({
      id: stat.id,
      roomId: stat.roomId,
      startTime: stat.startTime,
      endTime: stat.endTime,
      duration: stat.duration,
      createdAt: stat.createdAt,
      updatedAt: stat.updatedAt,
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error('Ошибка при получении статистики звонков:', error);
    res.status(500).json({ error: 'Ошибка при получении статистики' });
  }
});


app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны для входа' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Пользователь с таким email не найден' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Неверный пароль' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({ message: 'Вход выполнен успешно', token,  user: {
      id: user.id,
      username: user.username,
      email: user.email,
      age: user.age,
      bio: user.bio,
      avatar: user.avatar,
      role: user.role
    } });
  } catch (error) {
    console.error('Ошибка при входе пользователя:', error);
    res.status(500).json({ error: 'Ошибка при входе пользователя' });
  }
});
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

app.get('/users/search', async (req, res) => {
  const { search } = req.query;

  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: search, 
          mode: 'insensitive', 
        },
      },
    });

    if (!users.length) {
      return res.status(404).json({ error: 'Пользователи не найдены' });
    }

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при поиске пользователей' });
  }
});


app.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
});

app.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, age, bio, avatar, role } = req.body;

  try {
      const existingUser = await prisma.user.findUnique({
          where: { username },
      });

      if (existingUser && existingUser.id !== Number(id)) {
          return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
      }

      const updatedUser = await prisma.user.update({
          where: { id: Number(id) },
          data: {
              username,
              email,
              age,
              bio,
              avatar,
              role,
          },
      });

      res.json(updatedUser);
  } catch (error) {
      res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
});


app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id: Number(id) },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error });
  }
});





app.post('/users/:id/friends', async (req, res) => {
  const { id } = req.params; // ID текущего пользователя
  const { friendId } = req.body; // ID друга

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    const friend = await prisma.user.findUnique({ where: { id: Number(friendId) } });

    if (!user || !friend) {
      return res.status(404).json({ error: 'Пользователь или друг не найден' });
    }

    const existingFriendship = await prisma.friend.findFirst({
      where: {
        userId: Number(id),
        friendId: Number(friendId),
      },
    });

    if (existingFriendship) {
      return res.status(400).json({ error: 'Пользователь уже в списке друзей' });
    }

    // Добавление друга
    await prisma.friend.create({
      data: {
        userId: Number(id),
        friendId: Number(friendId),
      },
    });

    res.status(201).json({ message: 'Друг успешно добавлен' });
  } catch (error) {
    console.error('Ошибка добавления друга:', error);
    res.status(500).json({ error: 'Ошибка добавления друга' });
  }
});

app.delete('/users/:id/friends/:friendId', async (req, res) => {
  const { id, friendId } = req.params;

  try {
    // Удаление друга
    const result = await prisma.friend.deleteMany({
      where: {
        userId: Number(id),
        friendId: Number(friendId),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Друг не найден в списке' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Ошибка удаления друга:', error);
    res.status(500).json({ error: 'Ошибка удаления друга' });
  }
});

app.post('/users/:id/blacklist', async (req, res) => {
  const { id } = req.params;
  const { blockedId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    const blocked = await prisma.user.findUnique({ where: { id: Number(blockedId) } });

    if (!user || !blocked) {
      return res.status(404).json({ error: 'Пользователь или блокируемый не найден' });
    }

    const existingBlock = await prisma.blacklist.findFirst({
      where: {
        userId: Number(id),
        blockedId: Number(blockedId),
      },
    });

    if (existingBlock) {
      return res.status(400).json({ error: 'Пользователь уже в черном списке' });
    }

    await prisma.blacklist.create({
      data: {
        userId: Number(id),
        blockedId: Number(blockedId),
      },
    });

    res.status(201).json({ message: 'Пользователь добавлен в черный список' });
  } catch (error) {
    console.error('Ошибка добавления в черный список:', error);
    res.status(500).json({ error: 'Ошибка добавления в черный список' });
  }
});

app.delete('/users/:id/blacklist/:blockedId', async (req, res) => {
  const { id, blockedId } = req.params;

  try {
    const result = await prisma.blacklist.deleteMany({
      where: {
        userId: Number(id),
        blockedId: Number(blockedId),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Пользователь не найден в черном списке' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Ошибка удаления из черного списка:', error);
    res.status(500).json({ error: 'Ошибка удаления из черного списка' });
  }
});

app.get('/users/:id/friends', async (req, res) => {
  const { id } = req.params;

  try {
    const friends = await prisma.friend.findMany({
      where: { userId: Number(id) },
      include: { friend: true }, 
    });

    res.json(friends.map(f => f.friend));
  } catch (error) {
    console.error('Ошибка получения списка друзей:', error);
    res.status(500).json({ error: 'Ошибка получения списка друзей' });
  }
});

app.get('/users/:id/blacklist', async (req, res) => {
  const { id } = req.params;

  try {
    const blacklist = await prisma.blacklist.findMany({
      where: { userId: Number(id) },
      include: { blocked: true }, 
    });

    res.json(blacklist.map(b => b.blocked));
  } catch (error) {
    console.error('Ошибка получения черного списка:', error);
    res.status(500).json({ error: 'Ошибка получения черного списка' });
  }
});

const PORT = process.env.PORT || 5000;

https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
  console.log(`Database server is running on https://0.0.0.0:${PORT}`);
});