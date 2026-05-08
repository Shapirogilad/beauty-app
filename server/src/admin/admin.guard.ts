import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class AdminGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Run JWT verification first
    await super.canActivate(context)
    const req = context.switchToHttp().getRequest()
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('גישה מוגבלת למנהל בלבד')
    }
    return true
  }
}
