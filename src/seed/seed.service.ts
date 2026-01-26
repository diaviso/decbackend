import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuizDifficulty, QuestionType } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedData();
  }

  private async seedData() {
    const themeCount = await this.prisma.theme.count();
    
    if (themeCount > 0) {
      this.logger.log('Database already seeded, skipping...');
      return;
    }

    this.logger.log('Seeding database with accounting ethics data...');

    const themesData = [
      {
        title: 'Principes fondamentaux de déontologie',
        description: 'Les principes de base régissant la profession comptable',
        position: 1,
        quizzes: [
          {
            title: 'Intégrité et objectivité',
            description: 'Quiz sur les principes d\'intégrité et d\'objectivité',
            difficulty: QuizDifficulty.FACILE,
            timeLimit: 15,
            passingScore: 70,
            requiredStars: 0, // First quiz - no stars required
            isFree: true,
            questions: [
              {
                content: 'Quel est le principe fondamental qui exige que le professionnel comptable soit honnête dans toutes ses relations professionnelles?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'L\'intégrité', isCorrect: true },
                  { content: 'La confidentialité', isCorrect: false },
                  { content: 'La compétence', isCorrect: false },
                  { content: 'L\'indépendance', isCorrect: false },
                ],
              },
              {
                content: 'Quels sont les éléments clés de l\'objectivité? (Plusieurs réponses possibles)',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Impartialité dans les jugements professionnels', isCorrect: true },
                  { content: 'Absence de conflits d\'intérêts', isCorrect: true },
                  { content: 'Maximisation des profits', isCorrect: false },
                  { content: 'Indépendance d\'esprit', isCorrect: true },
                ],
              },
              {
                content: 'Un expert-comptable peut-il accepter un cadeau de valeur significative d\'un client?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'Non, cela compromet l\'objectivité', isCorrect: true },
                  { content: 'Oui, si le client insiste', isCorrect: false },
                  { content: 'Oui, si cela reste confidentiel', isCorrect: false },
                  { content: 'Oui, sans restriction', isCorrect: false },
                ],
              },
            ],
          },
          {
            title: 'Compétence et diligence professionnelles',
            description: 'Évaluation des connaissances sur la compétence professionnelle',
            difficulty: QuizDifficulty.MOYEN,
            timeLimit: 20,
            passingScore: 75,
            requiredStars: 10, // Requires 10 stars to unlock
            isFree: false,
            questions: [
              {
                content: 'Que signifie le principe de compétence professionnelle?',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Maintenir ses connaissances et compétences à jour', isCorrect: true },
                  { content: 'Agir avec diligence selon les normes', isCorrect: true },
                  { content: 'Accepter tous les mandats proposés', isCorrect: false },
                  { content: 'Fournir des services de qualité', isCorrect: true },
                ],
              },
              {
                content: 'Un professionnel comptable doit-il refuser une mission s\'il n\'a pas les compétences requises?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'Oui, ou obtenir l\'assistance d\'un expert', isCorrect: true },
                  { content: 'Non, il peut apprendre sur le tas', isCorrect: false },
                  { content: 'Non, s\'il est bien payé', isCorrect: false },
                  { content: 'Cela dépend du client', isCorrect: false },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Confidentialité et secret professionnel',
        description: 'Obligations de confidentialité dans la profession comptable',
        position: 2,
        quizzes: [
          {
            title: 'Secret professionnel',
            description: 'Quiz sur les obligations de confidentialité',
            difficulty: QuizDifficulty.MOYEN,
            timeLimit: 20,
            passingScore: 70,
            requiredStars: 15, // Requires 15 stars to unlock
            isFree: true,
            questions: [
              {
                content: 'Le secret professionnel s\'applique-t-il après la fin de la relation professionnelle?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Oui, il persiste indéfiniment', isCorrect: true },
                  { content: 'Non, il cesse immédiatement', isCorrect: false },
                  { content: 'Seulement pendant 5 ans', isCorrect: false },
                  { content: 'Cela dépend du contrat', isCorrect: false },
                ],
              },
              {
                content: 'Dans quelles situations peut-on divulguer des informations confidentielles? (Plusieurs réponses)',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.DIFFICILE,
                options: [
                  { content: 'Obligation légale ou réglementaire', isCorrect: true },
                  { content: 'Autorisation du client', isCorrect: true },
                  { content: 'Intérêt personnel du professionnel', isCorrect: false },
                  { content: 'Devoir professionnel (ex: contrôle qualité)', isCorrect: true },
                ],
              },
              {
                content: 'Un expert-comptable peut-il discuter des affaires d\'un client avec sa famille?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'Non, jamais', isCorrect: true },
                  { content: 'Oui, avec son conjoint', isCorrect: false },
                  { content: 'Oui, si c\'est général', isCorrect: false },
                  { content: 'Oui, sans citer de noms', isCorrect: false },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Indépendance et conflits d\'intérêts',
        description: 'Maintien de l\'indépendance dans l\'exercice professionnel',
        position: 3,
        quizzes: [
          {
            title: 'Indépendance du commissaire aux comptes',
            description: 'Quiz sur l\'indépendance et les incompatibilités',
            difficulty: QuizDifficulty.DIFFICILE,
            timeLimit: 25,
            passingScore: 80,
            requiredStars: 25, // Requires 25 stars to unlock
            isFree: false,
            questions: [
              {
                content: 'Quelles sont les deux formes d\'indépendance requises?',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Indépendance d\'esprit', isCorrect: true },
                  { content: 'Indépendance apparente', isCorrect: true },
                  { content: 'Indépendance financière', isCorrect: false },
                  { content: 'Indépendance géographique', isCorrect: false },
                ],
              },
              {
                content: 'Un commissaire aux comptes peut-il fournir des services de conseil à son client d\'audit?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.DIFFICILE,
                options: [
                  { content: 'Non, c\'est une incompatibilité', isCorrect: true },
                  { content: 'Oui, sans restriction', isCorrect: false },
                  { content: 'Oui, si facturé séparément', isCorrect: false },
                  { content: 'Oui, pour des petits montants', isCorrect: false },
                ],
              },
              {
                content: 'Qu\'est-ce qu\'un conflit d\'intérêts?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Une situation où l\'objectivité professionnelle peut être compromise', isCorrect: true },
                  { content: 'Un désaccord avec le client', isCorrect: false },
                  { content: 'Une concurrence entre clients', isCorrect: false },
                  { content: 'Un problème de rémunération', isCorrect: false },
                ],
              },
              {
                content: 'Quelles mesures de sauvegarde peut-on mettre en place face à une menace d\'indépendance? (Plusieurs réponses)',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.DIFFICILE,
                options: [
                  { content: 'Rotation des équipes', isCorrect: true },
                  { content: 'Revue par un confrère', isCorrect: true },
                  { content: 'Augmenter les honoraires', isCorrect: false },
                  { content: 'Transparence et divulgation', isCorrect: true },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Comportement professionnel',
        description: 'Normes de comportement et respect des lois',
        position: 4,
        quizzes: [
          {
            title: 'Éthique et comportement',
            description: 'Quiz sur le comportement professionnel attendu',
            difficulty: QuizDifficulty.FACILE,
            timeLimit: 15,
            passingScore: 70,
            requiredStars: 20, // Requires 20 stars to unlock
            isFree: true,
            questions: [
              {
                content: 'Le comportement professionnel implique de:',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'Se conformer aux lois et règlements', isCorrect: true },
                  { content: 'Éviter tout acte discréditant la profession', isCorrect: true },
                  { content: 'Maximiser ses profits', isCorrect: false },
                  { content: 'Agir avec honnêteté', isCorrect: true },
                ],
              },
              {
                content: 'La publicité pour les services professionnels doit être:',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'Honnête, non trompeuse et digne', isCorrect: true },
                  { content: 'Agressive pour attirer des clients', isCorrect: false },
                  { content: 'Comparative avec les concurrents', isCorrect: false },
                  { content: 'Interdite dans tous les cas', isCorrect: false },
                ],
              },
              {
                content: 'Un professionnel comptable doit-il respecter les normes professionnelles?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.FACILE,
                options: [
                  { content: 'Oui, c\'est une obligation', isCorrect: true },
                  { content: 'Non, ce sont des recommandations', isCorrect: false },
                  { content: 'Seulement pour les grands dossiers', isCorrect: false },
                  { content: 'Cela dépend du client', isCorrect: false },
                ],
              },
            ],
          },
        ],
      },
      {
        title: 'Responsabilités et sanctions',
        description: 'Responsabilités professionnelles et disciplinaires',
        position: 5,
        quizzes: [
          {
            title: 'Responsabilité du professionnel comptable',
            description: 'Quiz sur les différentes formes de responsabilité',
            difficulty: QuizDifficulty.DIFFICILE,
            timeLimit: 25,
            passingScore: 75,
            requiredStars: 35, // Requires 35 stars to unlock
            isFree: false,
            questions: [
              {
                content: 'Quels types de responsabilité un expert-comptable peut-il engager? (Plusieurs réponses)',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.DIFFICILE,
                options: [
                  { content: 'Responsabilité civile', isCorrect: true },
                  { content: 'Responsabilité pénale', isCorrect: true },
                  { content: 'Responsabilité disciplinaire', isCorrect: true },
                  { content: 'Responsabilité politique', isCorrect: false },
                ],
              },
              {
                content: 'Quelle instance est compétente pour les sanctions disciplinaires des experts-comptables?',
                type: QuestionType.QCU,
                difficulty: QuizDifficulty.MOYEN,
                options: [
                  { content: 'La chambre de discipline de l\'Ordre', isCorrect: true },
                  { content: 'Le tribunal de commerce', isCorrect: false },
                  { content: 'Le conseil d\'administration', isCorrect: false },
                  { content: 'L\'assemblée générale', isCorrect: false },
                ],
              },
              {
                content: 'Quelles peuvent être les sanctions disciplinaires? (Plusieurs réponses)',
                type: QuestionType.QCM,
                difficulty: QuizDifficulty.DIFFICILE,
                options: [
                  { content: 'L\'avertissement', isCorrect: true },
                  { content: 'La radiation', isCorrect: true },
                  { content: 'L\'emprisonnement', isCorrect: false },
                  { content: 'La suspension temporaire', isCorrect: true },
                ],
              },
            ],
          },
        ],
      },
    ];

    for (const themeData of themesData) {
      const { quizzes, ...themeInfo } = themeData;
      
      const theme = await this.prisma.theme.create({
        data: themeInfo,
      });

      for (const quizData of quizzes) {
        const { questions, ...quizInfo } = quizData;
        
        const quiz = await this.prisma.quiz.create({
          data: {
            ...quizInfo,
            themeId: theme.id,
          },
        });

        for (const questionData of questions) {
          const { options, ...questionInfo } = questionData;
          
          await this.prisma.question.create({
            data: {
              ...questionInfo,
              quizId: quiz.id,
              options: {
                create: options,
              },
            },
          });
        }
      }
    }

    this.logger.log('Database seeding completed successfully!');
  }
}
