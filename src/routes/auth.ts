//API Routes for Authentication
import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { auth } from "../middleware/auth";

//Group related routes and middleware together
const router = Router();

//Register new user route
router.post("/register", register);

//Login user route
router.post("/login", login);

//Logout user route using authentication middleware
router.post("/logout", auth, logout);  //Only authenticated users can logout

//Get details of currently logged user
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;