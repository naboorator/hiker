import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal-dialog.component.html',
  styleUrl: './modal-dialog.component.css',
})
export class ModalDialogComponent {
  readonly title = input.required<string>();
  readonly closeLabel = input.required<string>();
  readonly dialogRole = input.required<'dialog' | 'alertdialog'>();
  readonly width = input.required<string>();
  readonly showCloseButton = input.required<boolean>();
  readonly closeOnBackdrop = input.required<boolean>();
  readonly closeOnEscape = input.required<boolean>();
  readonly closed = output<void>();

  closeFromBackdrop(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  closeFromEscape(): void {
    if (this.closeOnEscape()) this.closed.emit();
  }
}
