import 'package:flutter/material.dart';
import 'login_form.dart';
import 'signup_form.dart';
import 'home_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // State to toggle between Login (true) and Sign Up (false)
  bool isLogin = true;

  void toggleAuthMode() {
    setState(() {
      isLogin = !isLogin;
    });
  }

  // --- Placeholder Logic Functions ---
  void _submitLoginForm(String email, String password) {
    // Temporary authentication credentials
    const String tempEmail = 'rishirajraj124@gmail.com';
    const String tempPassword = '123456';

    // Validate credentials
    if (email == tempEmail && password == tempPassword) {
      // Show success message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Login Successful!'),
          duration: Duration(seconds: 1),
        ),
      );

      // Navigate to HomeScreen after a short delay
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (context) => const HomeScreen()),
          );
        }
      });
    } else {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid email or password!'),
          duration: Duration(seconds: 2),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _submitSignupForm() {
    // 1. Validate form fields (e.g., check password complexity)
    // 2. Register new user

    // On success, you might automatically log them in or ask them to login:
    // setState(() { isLogin = true; });

    // Placeholder: Show a message
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Sign Up Attempted!')));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          child: Container(
            padding: const EdgeInsets.all(30.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                // 1. Header (Logo/Title)
                _buildHeader(context),
                const SizedBox(height: 40.0),

                // 2. Form (Login or Sign Up)
                isLogin
                    ? LoginForm(onSubmit: _submitLoginForm)
                    : SignupForm(onSubmit: _submitSignupForm),

                const SizedBox(height: 20.0),

                // 3. Switcher Button
                _buildToggleSwitch(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    // Customize this to match your app's branding/theme image
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Placeholder for your app's theme image or logo
        // Replace with: Image.asset('assets/theme_image.png', height: 100)
        Container(
          height: 80,
          width: 80,
          decoration: BoxDecoration(
            color: Colors.indigo.shade100,
            borderRadius: BorderRadius.circular(15),
          ),
          child: Icon(
            Icons.location_city,
            size: 40,
            color: Colors.indigo.shade800,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          isLogin ? 'Welcome Back!' : 'Join the Community',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.indigo.shade800, // Theme Color
          ),
        ),
        Text(
          isLogin
              ? 'Sign in to report or track issues.'
              : 'Create an account to start reporting.',
          style: Theme.of(context).textTheme.titleSmall,
        ),
      ],
    );
  }

  Widget _buildToggleSwitch(BuildContext context) {
    return Center(
      child: TextButton(
        onPressed: toggleAuthMode,
        child: Text.rich(
          TextSpan(
            text: isLogin
                ? 'Don\'t have an account? '
                : 'Already have an account? ',
            style: const TextStyle(color: Colors.black54),
            children: [
              TextSpan(
                text: isLogin ? 'Sign Up' : 'Login',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(
                    context,
                  ).primaryColor, // Use a main theme color
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
