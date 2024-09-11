import {debuglog} from 'node:util';
import puppeteer from 'puppeteer';

const debug = debuglog('kr-software-engineer');

export type QueryPagination = {
	page?: number;
	pageSize?: number;
};

export enum AccountType {
	Personal = '1',
	Business = '2',
}

export enum ExpertiseSection {
	Employment = 'workCareer',
	Skill = 'skillCareer',
	Degree = 'scholar',
	Certification = 'skillCert',
	Education = 'education',
	Award = 'prize',
}

export enum VerificationStatus {
	Nothing = '',
	NotStarted = '1',
	Processing = '2',
	Verified = '3',
	Rejected = '4',
}

export enum ProofingMethod {
	SignedByCompany = '1',
	OfflinePaperDocument = '2',
	UploadDocumentFile = '4',
}

export enum RegistrationRequestProcess {
	NotRequested = '',
	Requested = '1',
	Receiving = '2',
	Received = '3',
	Reviewing = '4',
	ChangesRequested = '5',
	ChangedToRereviewOrRequestCanceled = '6', // FIXME
	FullyProcessedEvenIfRejected = '7',
}

export enum CertificateTakeoutMethod {
	SelfPrint = '1',
	DeliveryPostpaid = '2',
	ExpressDeliveryPostpaid = '3',
	OfflineDirect = '4',
}

export enum CertificatePrintStatus {
	IssueCancelled = '발급취소',
	AlreadyPrinted = '출력완료',
}

export default class EngineerAccountController {
	static async start(
		id: string,
		password: string,
		{
			accountType = AccountType.Personal,
			browser,
		}: {accountType?: AccountType; browser?: puppeteer.Browser} = {},
	) {
		const definitelyBrowser = browser ?? (await puppeteer.launch());

		const page = await definitelyBrowser.newPage();

		const controller = new this(definitelyBrowser, page);

		controller.page.on('dialog', async (dialog) => {
			dialog.message();
			await dialog.dismiss();
		});

		await controller.page.goto('https://career.sw.or.kr/join/login.jsp');

		await controller.page.setViewport({width: 1920, height: 1080});

		await controller.page
			.locator(`input[name=memberDiv][value="${accountType}"]`)
			.click();
		await controller.page.locator('#input_id').fill(id);
		await controller.page.locator('#input_pw').fill(password);

		debug('Trying to sign in');

		await Promise.all([
			controller.page.waitForNavigation(),
			controller.page.locator('.btn_login').click(),
		]);

		if (controller.page.url() === 'https://career.sw.or.kr/join/login.jsp') {
			await controller.finalize({closeBrowser: browser === undefined});

			throw new Error('Failed to sign in');
		}

		debug('Signed in');

		return controller;
	}

	protected constructor(
		protected browser: puppeteer.Browser,
		protected page: puppeteer.Page,
	) {}

	async finalize({closeBrowser = true} = {}) {
		await this.page.goto('https://career.sw.or.kr/join/logout.jsp');

		await this.page.waitForNavigation();

		await this.page.close();

		await this.browser[closeBrowser ? 'close' : 'disconnect']();
	}

	async getGlobalProperties<T extends string>(
		propertyNames: T[],
	): Promise<Record<T, unknown>> {
		return this.page.evaluate((propertyNames) => {
			return Object.fromEntries(
				propertyNames.map((propertyName) => [
					propertyName,
					Object.hasOwn(globalThis, propertyName)
						? (globalThis[propertyName as keyof typeof globalThis] as unknown)
						: undefined,
				]),
			) as Record<(typeof propertyNames)[number], unknown>;
		}, propertyNames);
	}

	async fetchExpertises() {
		await this.page.goto(
			'https://career.sw.or.kr/personal/reg/swc_write01.jsp',
		);

		return this.getGlobalProperties(Object.values(ExpertiseSection));
	}

	async fetchCertificateIssueRequests(pagination: QueryPagination = {}) {
		await this.page.goto(
			this.createPaginatedUrl(
				'https://career.sw.or.kr/personal/reg/swo_list.jsp',
				pagination,
			),
		);

		const requests = await this.page.$$eval('.list_tbl_01 tbody tr', (rows) =>
			rows.map((row) => {
				const childText = (index: number) => {
					const text = row.children[index].textContent?.trim();

					return text === '' ? undefined : text;
				};

				return {
					index: childText(0),
					id: row.querySelector('a')?.getAttribute('href')?.split(`'`)[1],
					requestDate: childText(1),
					copies: childText(2),
					verifiableId: childText(3),
					printDate: childText(4),
					takeoutMethod: childText(5),
					printStatus: childText(6),
				};
			}),
		);

		return requests.map((request) => ({
			...request,
			index: Number.parseInt(request.index!, 10),
			requestDate: new Date(request.requestDate!),
			copies: Number.parseInt(request.copies!, 10),
			printDate:
				request.printDate === undefined
					? undefined
					: new Date(request.printDate),
			takeoutMethod:
				request.takeoutMethod === '프린터'
					? CertificateTakeoutMethod.SelfPrint
					: request.takeoutMethod === '택배(착불)' // FIXME
						? CertificateTakeoutMethod.DeliveryPostpaid
						: request.takeoutMethod === '퀵서비스(착불)' // FIXME
							? CertificateTakeoutMethod.ExpressDeliveryPostpaid
							: request.takeoutMethod === '방문수령' // FIXME
								? CertificateTakeoutMethod.OfflineDirect
								: undefined,
		}));
	}

	protected createPaginatedUrl(
		href: string,
		{page = 0, pageSize = 10}: QueryPagination,
	) {
		const url = new URL(href);

		url.searchParams.set('page', String(page + 1));
		url.searchParams.set('pageSize', String(pageSize));

		return url.toString();
	}
}
