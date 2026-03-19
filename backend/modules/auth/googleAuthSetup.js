import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export function registerGoogleAuth({
  app,
  passport,
  repo,
  db,
  saveDatabaseDebounced,
  usePostgreSQL,
  FRONTEND_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  jwt,
  JWT_SECRET,
  activeTokens,
}) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.log('⚠️ Google OAuth não configurado (GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não definidos)');
    return false;
  }

  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const name = profile.displayName || profile.name?.givenName || 'Usuário';
      const googleId = profile.id;
      const photo = profile.photos?.[0]?.value;

      if (!email) {
        return done(new Error('Email não fornecido pelo Google'), null);
      }

      let user;
      const emailLower = email.toLowerCase();

      if (usePostgreSQL) {
        user = await repo.getUserByEmail(emailLower);

        if (!user) {
          user = await repo.createUser({
            email: emailLower,
            full_name: name,
            role: 'customer',
            is_master: false,
            subscriber_email: null,
            google_id: googleId,
            google_photo: photo
          });

          try {
            await repo.createCustomer({
              email: emailLower,
              name,
              phone: null,
              address: null,
              complement: null,
              neighborhood: null,
              city: null,
              zipcode: null,
              subscriber_email: null,
              birth_date: null,
              cpf: null,
              password_hash: null
            }, null);
          } catch (customerError) {
            console.warn('⚠️ Erro ao criar customer via Google OAuth (não crítico):', customerError.message);
          }
        } else if (!user.google_id) {
          user = await repo.updateUser(user.id, {
            google_id: googleId,
            google_photo: photo
          });
        }
      } else if (db && db.users) {
        user = db.users.find(u => (u.email || '').toLowerCase() === emailLower);

        if (!user) {
          const newUser = {
            id: Date.now().toString(),
            email: emailLower,
            full_name: name,
            role: 'customer',
            is_master: false,
            subscriber_email: null,
            google_id: googleId,
            google_photo: photo,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          db.users.push(newUser);

          if (db.customers) {
            const newCustomer = {
              id: String(Date.now() + 1),
              email: emailLower,
              name,
              phone: null,
              address: null,
              complement: null,
              neighborhood: null,
              city: null,
              zipcode: null,
              subscriber_email: null,
              birth_date: null,
              cpf: null,
              password_hash: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.customers.push(newCustomer);
          }

          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
          user = newUser;
        } else if (!user.google_id) {
          user.google_id = googleId;
          user.google_photo = photo;
          user.updated_at = new Date().toISOString();
          if (saveDatabaseDebounced) {
            saveDatabaseDebounced(db);
          }
        }
      }

      return done(null, user);
    } catch (error) {
      console.error('Erro ao processar login Google:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      let user;
      if (usePostgreSQL) {
        user = await repo.getUserById(id);
      } else if (db && db.users) {
        user = db.users.find(u => u.id === id);
      }
      done(null, user || null);
    } catch (error) {
      done(error, null);
    }
  });

  app.get(
    '/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/api/auth/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`
    }),
    async (req, res) => {
      try {
        const user = req.user;

        if (!user) {
          return res.redirect(`${FRONTEND_URL}/login?error=user_not_found`);
        }

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            is_master: user.is_master
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        activeTokens[token] = user.email;

        return res.redirect(
          `${FRONTEND_URL}/auth/callback?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.full_name || '')}`
        );
      } catch (error) {
        console.error('Erro no callback Google:', error);
        return res.redirect(`${FRONTEND_URL}/login?error=callback_error`);
      }
    }
  );

  const callbackUrl = GOOGLE_CALLBACK_URL;
  console.log('✅ Google OAuth configurado');
  console.log('🔗 URL de Callback:', callbackUrl);
  console.log('📋 IMPORTANTE: Adicione esta URL exata no Google Cloud Console:');
  console.log('   → URIs de redirecionamento autorizados:', callbackUrl);

  return true;
}
