import { Router } from 'express';
import tournamentController from '../controllers/tournamentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Tournament routes
router.get('/', tournamentController.getTournaments.bind(tournamentController));
router.get('/featured', tournamentController.getFeaturedTournaments.bind(tournamentController));
router.get('/my-tournaments', tournamentController.getMyTournaments.bind(tournamentController));
router.get('/:id', tournamentController.getTournamentById.bind(tournamentController));
router.post('/:id/join', tournamentController.joinTournament.bind(tournamentController));
router.post('/:id/leave', tournamentController.leaveTournament.bind(tournamentController));
router.get('/:id/leaderboard', tournamentController.getTournamentLeaderboard.bind(tournamentController));
router.get('/:id/my-rank', tournamentController.getMyRankInTournament.bind(tournamentController));

export default router;
