// 스토리 컷 (S19) — 원본은 리포 밖 ../assets/assets-story/, webp 변환해 반영.
// story_end_2 는 굿·배드 공용 컷 — 원본 end_good_2 와 end_bad_2 가 같은 파일이다(바이트 동일 확인).

// 굿/배드 분기 — 최종 코인 기준(사용자 확정 400). 5주문 전부 통과선이면 300이라 +α 필요. ⚠ 실측 후 조정
export const GOOD_ENDING_COINS = 400;

// 대사 치환 — {name} 은 유저 이름, {name}아 는 호격(받침 있으면 '아', 없으면 '야'), {coins} 는 귀환 주문 값
export function fillLine(text, name) {
  const last = name.charCodeAt(name.length - 1);
  const voc =
    last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 > 0 ? `${name}아` : `${name}야`;
  return text
    .replaceAll("{name}아", voc)
    .replaceAll("{name}", name)
    .replaceAll("{coins}", GOOD_ENDING_COINS.toLocaleString());
}

// 인트로 7컷 — 첫 컷은 배경만(무대가 열리는 느낌), 이후 begin 1~6. lines 는 컷 위 말풍선 대사.
export const STORY = {
  begin: [
    {
      img: "/assets/bg_default.webp",
      lines: [
        { who: "??", text: "어나.. 일어나..!" },
        { who: "{name}", text: "어라.. 이게 뭐지? 엄마 목소리? 벌써 출근시간이야?" },
      ],
    },
    {
      img: "/assets/story_begin_1.webp",
      lines: [
        { who: "??", text: "어서 일어나!! 제발 일어나줘!" },
        { who: "{name}", text: "으음.. 엄마 목소리가 왜 이렇게 울퉁불퉁하지? 이상해.. 꿈속인가?" },
        { who: "{name}", text: "오잉? 여긴 대체 뭐야? 난 분명히 일요일 저녁에 자취방에서 잠들었는데...." },
      ],
    },
    {
      img: "/assets/story_begin_2.webp",
      lines: [
        { who: "??", text: "드디어 일어났구나!!! 드디어 나 점박이말차가 호출에 성공했어!", face: "chef" },
        { who: "점박이말차", text: "{name}아! 날 좀 도와줘!", face: "chef" },
        { who: "점박이말차", text: "내가 뭉게뭉게 마을의 파티세리 콘테스트에 갈 동안 날 도와줄 점원을 호출했어! 얏호", face: "chef" },
        { who: "{name}", text: "뭉게뭉게마을? 몬스터? 대체 무슨 말이지?" },
      ],
    },
    {
      img: "/assets/story_begin_3.webp",
      lines: [
        { who: "{name}", text: "이게.. 나?", face: "user" },
        { who: "{name}", text: "내가 몬스터가 됐잖아!!!!", face: "user" },
        { who: "{name}", text: "팔다리가 푸딩처럼 흐물흐물해..", face: "user" },
      ],
    },
    {
      img: "/assets/story_begin_4.webp",
      lines: [
        { who: "점박이말차", text: "아무튼 난 내일 돌아올거니까, 돌아오면 꼭 돌려보내 줄게! 케이크 가게를 잘 부탁해!", face: "chef" },
        { who: "점박이말차", text: "아참, 널 다시 돌려보내려는 주문을 외우려면 {coins} 코인이 필요해. 그건 케이크 가게 운영으로 알아서 벌어봐!", face: "chef" },
        { who: "{name}", text: "이게 대체 무슨 상황이야?", face: "user" },
      ],
    },
    {
      img: "/assets/story_begin_5.webp",
      lines: [
        { who: "???", text: "룰루~ 맛있는 케이크!", face: "pink" },
        { who: "{name}", text: "으악 벌써 손님이 왔잖아? 난 어떻게 하면 좋지?", face: "user" },
      ],
    },
    {
      img: "/assets/story_begin_6.webp",
      lines: [
        { who: "???", text: "걱정마 {name}", face: "assistant" },
        { who: "{name}", text: "으악, 반려동물이 말한다", face: "user" },
        { who: "???", text: "실례야, 내 이름은 커스터드물범이라구! 또 점박이말차가 저러고 나갔구나..", face: "assistant" },
        { who: "커스터드물범", text: "나는 손이 짧아서 케이크를 직접 못 만들지만, 어떻게 하는지는 내가 알려줄게!", face: "assistant" },
        { who: "커스터드물범", text: "걱정 말고 첫 번째 주문부터 시작해 보자. 원래 있던 곳으로 돌아가야지", face: "assistant" },
      ],
    },
  ],
  // 엔딩은 대사 없이 컷만
  endGood: [
    { img: "/assets/story_end_good_1.webp" },
    { img: "/assets/story_end_2.webp" },
    { img: "/assets/story_end_good_3.webp" },
    { img: "/assets/story_end_good_4.webp" },
    { img: "/assets/story_end_good_5.webp" },
  ],
  // 배드 엔딩은 원안부터 1·2·4 세 컷 구성 (3번 컷 없음)
  endBad: [
    { img: "/assets/story_end_bad_1.webp" },
    { img: "/assets/story_end_2.webp" },
    { img: "/assets/story_end_bad_4.webp" },
  ],
};
