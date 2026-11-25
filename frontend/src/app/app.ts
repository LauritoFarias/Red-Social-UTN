import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { ToastService } from './services/toast';
import { LoadingService } from './services/loading';
import { Loading } from './components/loading/loading';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loading],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  authService = inject(AuthService);
  toastService = inject(ToastService);
  loadingService = inject(LoadingService);
}
